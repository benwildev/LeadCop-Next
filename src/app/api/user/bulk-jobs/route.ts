import { NextRequest, NextResponse } from "next/server";
import { db, bulkJobsTable, usersTable, type BulkJobResultItem } from "@/lib/db";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";
import { enqueueJob } from "@/lib/backend/workers";
import { maybeResetMonthlyUsage } from "@/app/api/check-email/route";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
      .where(eq(bulkJobsTable.userId, user.id))
      .orderBy(desc(bulkJobsTable.createdAt))
      .limit(50);

    return NextResponse.json(jobs.map(j => ({
      ...j,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt ? j.completedAt.toISOString() : null,
    })));
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createBulkJobSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(1000),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [userData] = await db
      .select({
        plan: usersTable.id,
        requestCount: usersTable.requestCount,
        requestLimit: usersTable.requestLimit,
        usagePeriodStart: usersTable.usagePeriodStart,
      })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    const bulkLimit = (planConfig as any).bulkEmailLimit ?? 0;

    if (bulkLimit === 0 || !planConfig.hasBulkValidation) {
      return NextResponse.json({
        error: "Bulk validation is not available on your plan.",
        planRequired: "PRO",
      }, { status: 403 });
    }

    const body = await req.json();
    const result = createBulkJobSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Provide an 'emails' array with valid email addresses." }, { status: 400 });

    const { emails } = result.data;

    if (bulkLimit > 0 && emails.length > bulkLimit) {
      return NextResponse.json({
        error: `Your plan allows up to ${bulkLimit.toLocaleString()} emails per bulk job. You submitted ${emails.length.toLocaleString()}.`,
        bulkEmailLimit: bulkLimit,
      }, { status: 400 });
    }

    const currentRequestCount = await maybeResetMonthlyUsage(
      user.id,
      userData.usagePeriodStart,
      userData.requestCount
    );

    const remaining = planConfig.requestLimit === -1 ? Infinity : (planConfig.requestLimit ?? 0) - currentRequestCount;
    if (planConfig.requestLimit !== -1 && remaining <= 0) {
      return NextResponse.json({ error: "Monthly request limit reached. Upgrade your plan for more." }, { status: 429 });
    }
    
    if (planConfig.requestLimit !== -1 && emails.length > remaining) {
      return NextResponse.json({
        error: `Only ${remaining} request(s) remaining this month but ${emails.length} emails submitted.`,
        requestsRemaining: remaining,
      }, { status: 429 });
    }

    await db
      .update(usersTable)
      .set({ requestCount: currentRequestCount + emails.length })
      .where(eq(usersTable.id, user.id));

    const [job] = await db
      .insert(bulkJobsTable)
      .values({
        userId: user.id,
        status: "pending",
        emails: emails satisfies string[],
        totalEmails: emails.length,
        processedCount: 0,
        disposableCount: 0,
        safeCount: 0,
        results: [] satisfies BulkJobResultItem[],
      })
      .returning({ id: bulkJobsTable.id });

    if (!job) return NextResponse.json({ error: "Failed to create job" }, { status: 500 });

    enqueueJob(job.id);

    return NextResponse.json({ jobId: job.id, totalEmails: emails.length }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
