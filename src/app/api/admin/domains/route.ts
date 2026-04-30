import { NextRequest, NextResponse } from "next/server";
import { db, domainsTable } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";
import { loadDomainCache } from "@/lib/backend/domain-cache";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const { domain } = await req.json();
    if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
      return NextResponse.json({ error: "domain is required" }, { status: 400 });
    }
    const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(clean)) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    try {
      await db.insert(domainsTable).values({ domain: clean });
      await loadDomainCache();
      const [{ count: total }] = await db.select({ count: count() }).from(domainsTable);
      return NextResponse.json({ domain: clean, totalDomains: Number(total) }, { status: 201 });
    } catch (err: any) {
      if (err?.code === "23505") {
        return NextResponse.json({ error: "Domain already exists in the blocklist" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain")?.toLowerCase();
  if (!domain) return NextResponse.json({ error: "Domain is required" }, { status: 400 });

  try {
    const deleted = await db.delete(domainsTable).where(eq(domainsTable.domain, domain)).returning();
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }
    await loadDomainCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
