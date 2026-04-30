import { NextRequest, NextResponse } from "next/server";
import { db, bulkJobsTable, type BulkJobResultItem } from "@/lib/db";
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
    const filename = `bulk-verify-job-${jobId}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
