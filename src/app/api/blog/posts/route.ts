import { NextRequest, NextResponse } from "next/server";
import { db, blogPostsTable } from "@/lib/db";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
  const tag = searchParams.get("tag")?.trim().toLowerCase();
  const offset = (page - 1) * limit;

  const posts = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      slug: blogPostsTable.slug,
      excerpt: blogPostsTable.excerpt,
      author: blogPostsTable.author,
      coverImage: blogPostsTable.coverImage,
      tags: blogPostsTable.tags,
      status: blogPostsTable.status,
      publishedAt: blogPostsTable.publishedAt,
      createdAt: blogPostsTable.createdAt,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "PUBLISHED"))
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(limit + 1)
    .offset(offset);

  const filtered = tag
    ? posts.filter((p: any) => p.tags?.split(",").some((t: any) => t.trim().toLowerCase() === tag))
    : posts;

  const hasMore = filtered.length > limit;
  const results = hasMore ? filtered.slice(0, limit) : filtered;

  return NextResponse.json({
    posts: results.map((p: any) => ({
      ...p,
      tags: p.tags ? p.tags.split(",").map((t: any) => t.trim()).filter(Boolean) : [],
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      hasMore,
      total: results.length,
    },
  });
}
