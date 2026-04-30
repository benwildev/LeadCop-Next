import { NextRequest, NextResponse } from "next/server";
import { db, siteSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";

const DEFAULTS = {
  siteTitle: "LeadCop",
  tagline: "Block Fake Emails. Protect Your Platform.",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  globalMetaTitle: "LeadCop — Disposable Email Detection API",
  globalMetaDescription: "Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy.",
  footerText: null as string | null,
};

async function getOrInitSettings() {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db.insert(siteSettingsTable).values({ id: 1 }).returning();
  return created;
}

export async function GET() {
  try {
    const s = await getOrInitSettings();
    return NextResponse.json({
      siteTitle: s.siteTitle ?? DEFAULTS.siteTitle,
      tagline: s.tagline ?? DEFAULTS.tagline,
      logoUrl: s.logoUrl ?? null,
      faviconUrl: s.faviconUrl ?? null,
      globalMetaTitle: s.globalMetaTitle ?? DEFAULTS.globalMetaTitle,
      globalMetaDescription: s.globalMetaDescription ?? DEFAULTS.globalMetaDescription,
      footerText: s.footerText ?? null,
      updatedAt: s.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ ...DEFAULTS, updatedAt: new Date().toISOString() });
  }
}
