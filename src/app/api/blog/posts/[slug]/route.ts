import { NextRequest, NextResponse } from "next/server";
import { db, blogPostsTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.status, "PUBLISHED")))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...post,
    tags: post.tags ? post.tags.split(",").map((t: any) => t.trim()).filter(Boolean) : [],
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt?.toISOString() ?? null,
  });
}
