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

  if (!job || job.userId !== session.userId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const results = (job.results as BulkJobResultItem[]) ?? [];

  const csvCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = "email,domain,is_disposable,reputation_score,risk_level,is_free_email,is_role_account,mx_valid,tags\n";
  const rows = results.map((r: any) => [
    csvCell(r.email),
    csvCell(r.domain),
    r.isDisposable ? "true" : "false",
    csvCell(r.reputationScore ?? ""),
    csvCell(r.riskLevel ?? ""),
    r.isFreeEmail ? "true" : "false",
    r.isRoleAccount ? "true" : "false",
    r.mxValid === null ? "" : r.mxValid ? "true" : "false",
    csvCell((r.tags ?? []).join(";")),
  ].join(",")).join("\n");

  const csv = header + rows;
  
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bulk-verify-job-${jobId}.csv"`,
    },
  });
}
