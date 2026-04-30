import { NextRequest, NextResponse } from "next/server";
import { db, whitelistTable, domainsTable } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";
import { loadDomainCache } from "@/lib/backend/domain-cache";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const list = await db.select().from(whitelistTable).orderBy(desc(whitelistTable.createdAt));
    return NextResponse.json({ whitelist: list });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    await db.insert(whitelistTable).values({ domain: clean }).onConflictDoNothing();
    await db.delete(domainsTable).where(eq(domainsTable.domain, clean));
    await loadDomainCache();

    return NextResponse.json({ domain: clean }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
