import { NextRequest, NextResponse } from "next/server";
import { db, bulkJobsTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobIdStr } = await params;
  const jobId = parseInt(jobIdStr, 10);
  if (isNaN(jobId)) return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });

  try {
    const [job] = await db
      .select()
      .from(bulkJobsTable)
      .where(and(eq(bulkJobsTable.id, jobId), eq(bulkJobsTable.userId, user.id)))
      .limit(1);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    return NextResponse.json({
      ...job,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt ? job.completedAt.toISOString() : null,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
