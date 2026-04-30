import { NextRequest, NextResponse } from "next/server";
import { db, pageSeoTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

const ALLOWED_SLUGS = new Set(["/", "/pricing", "/docs", "/login", "/signup", "/blog"]);

function formatPageSeo(row: any, slug: string) {
  if (!row) {
    return { slug, metaTitle: null, metaDescription: null, keywords: null, ogTitle: null, ogDescription: null, ogImage: null };
  }
  return {
    slug: row.slug,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    keywords: row.keywords,
    ogTitle: row.ogTitle,
    ogDescription: row.ogDescription,
    ogImage: row.ogImage,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: slugParts } = await params;
  let slug = "/" + (slugParts?.join("/") || "");
  if (slug === "/home") slug = "/";

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Unknown page slug" }, { status: 400 });
  }

  try {
    const [row] = await db.select().from(pageSeoTable).where(eq(pageSeoTable.slug, slug)).limit(1);
    return NextResponse.json(formatPageSeo(row, slug));
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updatePageSeoSchema = z.object({
  metaTitle: z.string().max(120).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  keywords: z.string().max(500).nullable().optional(),
  ogTitle: z.string().max(120).nullable().optional(),
  ogDescription: z.string().max(320).nullable().optional(),
  ogImage: z.string().url().max(2048).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug: slugParts } = await params;
  let slug = "/" + (slugParts?.join("/") || "");
  if (slug === "/home") slug = "/";

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Unknown page slug" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const result = updatePageSeoSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input", details: result.error.issues }, { status: 400 });

    const d = result.data;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (d.metaTitle !== undefined) updates.metaTitle = d.metaTitle;
    if (d.metaDescription !== undefined) updates.metaDescription = d.metaDescription;
    if (d.keywords !== undefined) updates.keywords = d.keywords;
    if (d.ogTitle !== undefined) updates.ogTitle = d.ogTitle;
    if (d.ogDescription !== undefined) updates.ogDescription = d.ogDescription;
    if (d.ogImage !== undefined) updates.ogImage = d.ogImage;

    const [existing] = await db.select({ id: pageSeoTable.id }).from(pageSeoTable).where(eq(pageSeoTable.slug, slug)).limit(1);
    
    if (!existing) {
      await db.insert(pageSeoTable).values({
        slug,
        ...d,
      });
    } else {
      await db.update(pageSeoTable).set(updates).where(eq(pageSeoTable.slug, slug));
    }

    return NextResponse.json({ message: "Page SEO updated" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
