import {
  db,
  bulkJobsTable,
  usersTable,
  type BulkJobResultItem,
} from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { getPlanConfig } from "./auth";
import { performBasicSecurityChecks, isFreeEmail, isRoleAccount } from "./reputation";
import { isDisposableDomain } from "./domain-cache";
import { logger } from "./logger";
import dns from "dns";

const dnsPromises = dns.promises;

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

const jobQueue: number[] = [];
let isWorkerRunning = false;

async function processJob(jobId: number): Promise<void> {
  const [job] = await db
    .select()
    .from(bulkJobsTable)
    .where(eq(bulkJobsTable.id, jobId))
    .limit(1);

  if (!job) return;

  await db
    .update(bulkJobsTable)
    .set({ status: "processing" })
    .where(eq(bulkJobsTable.id, jobId));

  const [userSettings] = await db
    .select({ plan: usersTable.plan, blockFreeEmails: usersTable.blockFreeEmails })
    .from(usersTable)
    .where(eq(usersTable.id, job.userId))
    .limit(1);

  const planConfig = await getPlanConfig(userSettings?.plan ?? "FREE");
  const blockFreeEmails = userSettings?.blockFreeEmails ?? false;

  const emails = (job.emails as string[]) ?? [];
  const results: BulkJobResultItem[] = [];
  let disposableCount = 0;
  let safeCount = 0;

  const BATCH_SIZE = 10;

  try {
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (email) => {
          try {
            const domain = email.split("@")[1]?.toLowerCase() || "";
            const isFree = isFreeEmail(domain);
            const isDisposable = isDisposableDomain(domain) || (blockFreeEmails && isFree);
            const mxValid = await checkMx(domain);
            
            return {
              email,
              domain,
              isDisposable,
              reputationScore: (isDisposable || !mxValid) ? 0 : 100,
              riskLevel: (isDisposable || !mxValid) ? "high" : "low",
              tags: isDisposable ? ["disposable"] : [],
              isValidSyntax: true,
              isFreeEmail: isFree,
              isRoleAccount: isRoleAccount(email.split("@")[0]),
              mxValid: mxValid,
            } satisfies BulkJobResultItem;
          } catch {
            return {
              email,
              domain: email.split("@")[1] ?? "",
              isDisposable: false,
              reputationScore: 0,
              riskLevel: "unknown" as any,
              tags: [],
              isValidSyntax: false,
              isFreeEmail: false,
              isRoleAccount: false,
              mxValid: null,
              error: "Check failed",
            } satisfies BulkJobResultItem;
          }
        })
      );

      for (const r of batchResults) {
        results.push(r);
        if (r.isDisposable) disposableCount++;
        else if (!(r as any).error) safeCount++;
      }

      await db
        .update(bulkJobsTable)
        .set({
          processedCount: results.length,
          disposableCount,
          safeCount,
          results: results as any,
        })
        .where(eq(bulkJobsTable.id, jobId));
    }

    await db
      .update(bulkJobsTable)
      .set({
        status: "done",
        completedAt: new Date(),
        processedCount: results.length,
        disposableCount,
        safeCount,
        results: results as any,
      })
      .where(eq(bulkJobsTable.id, jobId));
  } catch (err) {
    logger.error({ err, jobId }, "Bulk job failed");
    await db
      .update(bulkJobsTable)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
        results: results as any,
        processedCount: results.length,
        disposableCount,
        safeCount,
      })
      .where(eq(bulkJobsTable.id, jobId));
  }
}

async function runWorker(): Promise<void> {
  while (jobQueue.length > 0) {
    const jobId = jobQueue.shift()!;
    try {
      await processJob(jobId);
    } catch (err) {
      logger.error({ err, jobId }, "Worker loop error");
    }
  }
  isWorkerRunning = false;
}

export function enqueueJob(jobId: number): void {
  jobQueue.push(jobId);
  if (!isWorkerRunning) {
    isWorkerRunning = true;
    void runWorker();
  }
}

export function startBulkWorker(): void {
  logger.info("Initializing Bulk Worker...");
  db.select({ id: bulkJobsTable.id })
    .from(bulkJobsTable)
    .where(inArray(bulkJobsTable.status, ["pending", "processing"]))
    .then((rows) => {
      for (const r of rows) enqueueJob(r.id);
    })
    .catch((err) => logger.error({ err }, "Failed to restart pending bulk jobs"));
}
