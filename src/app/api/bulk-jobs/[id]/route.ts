import { NextRequest, NextResponse } from "next/server";
import { db, bulkJobsTable, type BulkJobResultItem } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/backend/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const jobId = parseInt(id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const [job] = await db
    .select()
    .from(bulkJobsTable)
    .where(eq(bulkJobsTable.id, jobId))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.userId !== session.userId) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json(job);
}
