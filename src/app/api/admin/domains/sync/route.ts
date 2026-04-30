import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/backend/session";
import { syncDomainsFromGitHub } from "@/lib/backend/domain-cache";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const { added, total } = await syncDomainsFromGitHub();
    return NextResponse.json({
      message: "Domain sync completed",
      domainsAdded: added,
      totalDomains: total,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
