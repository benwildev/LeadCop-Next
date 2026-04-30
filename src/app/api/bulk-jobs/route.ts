import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  db,
  bulkJobsTable,
  usersTable,
  type BulkJobResultItem,
} from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getPlanConfig } from "@/lib/backend/auth";
import { getSession } from "@/lib/backend/session";
import { maybeResetMonthlyUsage } from "../check-email/route";
import { enqueueJob } from "@/lib/backend/workers";

const createBulkJobSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(1000),
});

async function requireAuth(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) return null;
  return session.userId;
}

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createBulkJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { emails } = parsed.data;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    const bulkLimit = (planConfig as any).bulkEmailLimit ?? 0;

    if (bulkLimit === 0 || !planConfig.hasBulkValidation) {
      return NextResponse.json({
        error: "Bulk validation is not available on your plan.",
        planRequired: "PRO",
      }, { status: 403 });
    }

    if (bulkLimit > 0 && emails.length > bulkLimit) {
      return NextResponse.json({
        error: `Your plan allows up to ${bulkLimit.toLocaleString()} emails per bulk job.`,
        bulkEmailLimit: bulkLimit,
      }, { status: 400 });
    }

    const currentRequestCount = await maybeResetMonthlyUsage(userId, user.usagePeriodStart, user.requestCount);
    const remaining = planConfig.requestLimit === -1 ? Infinity : (planConfig.requestLimit ?? 0) - currentRequestCount;

    if (planConfig.requestLimit !== -1 && emails.length > remaining) {
      return NextResponse.json({
        error: `Only ${remaining} request(s) remaining this month.`,
        requestsRemaining: remaining,
      }, { status: 429 });
    }

    // Deduct quota upfront
    await db
      .update(usersTable)
      .set({ requestCount: currentRequestCount + emails.length })
      .where(eq(usersTable.id, userId));

    const [job] = await db
      .insert(bulkJobsTable)
      .values({
        userId,
        status: "pending",
        emails: emails as any,
        totalEmails: emails.length,
        processedCount: 0,
        disposableCount: 0,
        safeCount: 0,
        results: [] as any,
      })
      .returning({ id: bulkJobsTable.id });

    enqueueJob(job.id);

    return NextResponse.json({ jobId: job.id, totalEmails: emails.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await db
    .select({
      id: bulkJobsTable.id,
      status: bulkJobsTable.status,
      totalEmails: bulkJobsTable.totalEmails,
      processedCount: bulkJobsTable.processedCount,
      disposableCount: bulkJobsTable.disposableCount,
      safeCount: bulkJobsTable.safeCount,
      errorMessage: bulkJobsTable.errorMessage,
      createdAt: bulkJobsTable.createdAt,
      completedAt: bulkJobsTable.completedAt,
    })
    .from(bulkJobsTable)
    .where(eq(bulkJobsTable.userId, userId))
    .orderBy(desc(bulkJobsTable.createdAt))
    .limit(50);

  return NextResponse.json(jobs);
}
