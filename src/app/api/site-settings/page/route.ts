import { NextRequest, NextResponse } from "next/server";
import { db, pageSeoTable } from "@/lib/db";
import { eq } from "drizzle-orm";

const ALLOWED_SLUGS = new Set(["/", "/pricing", "/docs", "/login", "/signup", "/blog"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") || "/";

  if (!ALLOWED_SLUGS.has(slug)) {
    return NextResponse.json({ error: "Unknown page slug" }, { status: 400 });
  }

  try {
    const [row] = await db.select().from(pageSeoTable).where(eq(pageSeoTable.slug, slug)).limit(1);
    if (!row) {
      return NextResponse.json({ slug, metaTitle: null, metaDescription: null, keywords: null, ogTitle: null, ogDescription: null, ogImage: null });
    }
    return NextResponse.json({
      slug: row.slug,
      metaTitle: row.metaTitle,
      metaDescription: row.metaDescription,
      keywords: row.keywords,
      ogTitle: row.ogTitle,
      ogDescription: row.ogDescription,
      ogImage: row.ogImage,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ slug, metaTitle: null, metaDescription: null, keywords: null, ogTitle: null, ogDescription: null, ogImage: null });
  }
}
