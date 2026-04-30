import { NextRequest, NextResponse } from "next/server";
import { db, siteSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

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
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

const updateSiteSettingsSchema = z.object({
  siteTitle: z.string().min(1).max(120).optional(),
  tagline: z.string().max(240).optional(),
  logoUrl: z.string().url().max(2048).nullable().optional(),
  faviconUrl: z.string().url().max(2048).nullable().optional(),
  globalMetaTitle: z.string().max(120).optional(),
  globalMetaDescription: z.string().max(320).optional(),
  footerText: z.string().max(320).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = updateSiteSettingsSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });

    await getOrInitSettings();
    const updates: Record<string, any> = { updatedAt: new Date() };
    const d = result.data;
    if (d.siteTitle !== undefined) updates.siteTitle = d.siteTitle;
    if (d.tagline !== undefined) updates.tagline = d.tagline;
    if (d.logoUrl !== undefined) updates.logoUrl = d.logoUrl;
    if (d.faviconUrl !== undefined) updates.faviconUrl = d.faviconUrl;
    if (d.globalMetaTitle !== undefined) updates.globalMetaTitle = d.globalMetaTitle;
    if (d.globalMetaDescription !== undefined) updates.globalMetaDescription = d.globalMetaDescription;
    if (d.footerText !== undefined) updates.footerText = d.footerText;

    await db.update(siteSettingsTable).set(updates).where(eq(siteSettingsTable.id, 1));
    return NextResponse.json({ message: "Site settings updated" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
