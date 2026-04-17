import { Router, type Request, type Response } from "express";
import { db, blogPostsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/session.js";

const router = Router();

const createBlogPostSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, or hyphens"),
  excerpt: z.string().max(500).default(""),
  content: z.string().default(""),
  author: z.string().max(100).default("LeadCop Team"),
  coverImage: z.string().url().optional().nullable(),
  tags: z.string().max(500).default(""),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  seoTitle: z.string().max(255).optional().nullable(),
  seoDescription: z.string().max(500).optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
});

const updateBlogPostSchema = createBlogPostSchema.partial();

function serializePost(p: typeof blogPostsTable.$inferSelect) {
  return {
    ...p,
    tags: p.tags ? p.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    publishedAt: p.publishedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ── Public routes ─────────────────────────────────────────────────────────────

router.get("/blog/posts", async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1")));
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || "12"))));
  const tag = String(req.query.tag || "").trim().toLowerCase();
  const offset = (page - 1) * limit;

  let whereClause = eq(blogPostsTable.status, "PUBLISHED");

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
    .where(whereClause)
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(limit + 1)
    .offset(offset);

  const filtered = tag
    ? posts.filter(p => p.tags?.split(",").map(t => t.trim().toLowerCase()).includes(tag))
    : posts;

  const hasMore = filtered.length > limit;
  const results = hasMore ? filtered.slice(0, limit) : filtered;

  res.json({
    posts: results.map(p => ({
      ...p,
      tags: p.tags ? p.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
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
});

router.get("/blog/posts/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.status, "PUBLISHED")))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(serializePost(post));
});

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/blog/posts", requireAdmin, async (req: Request, res: Response) => {
  const posts = await db
    .select()
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.createdAt));

  res.json({ posts: posts.map(serializePost) });
});

router.post("/admin/blog/posts", requireAdmin, async (req: Request, res: Response) => {
  const result = createBlogPostSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues });
    return;
  }

  const data = result.data;
  const publishedAt = data.status === "PUBLISHED" ? new Date() : null;
  const tagsStr = Array.isArray(data.tags)
    ? (data.tags as string[]).join(",")
    : typeof data.tags === "string" ? data.tags : "";

  try {
    const [post] = await db
      .insert(blogPostsTable)
      .values({
        ...data,
        tags: tagsStr,
        publishedAt,
        updatedAt: new Date(),
      })
      .returning();

    res.status(201).json(serializePost(post));
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "A post with that slug already exists" });
    } else {
      throw err;
    }
  }
});

router.patch("/admin/blog/posts/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const result = updateBlogPostSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues });
    return;
  }

  const data = result.data;

  const [existing] = await db
    .select({ id: blogPostsTable.id, status: blogPostsTable.status, publishedAt: blogPostsTable.publishedAt })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const setPublishedAt =
    data.status === "PUBLISHED" && existing.status !== "PUBLISHED"
      ? new Date()
      : data.status === "DRAFT"
      ? null
      : existing.publishedAt;

  const tagsStr = data.tags !== undefined
    ? (Array.isArray(data.tags) ? (data.tags as string[]).join(",") : String(data.tags))
    : undefined;

  try {
    const [updated] = await db
      .update(blogPostsTable)
      .set({
        ...data,
        ...(tagsStr !== undefined ? { tags: tagsStr } : {}),
        publishedAt: setPublishedAt,
        updatedAt: new Date(),
      })
      .where(eq(blogPostsTable.id, id))
      .returning();

    res.json(serializePost(updated));
  } catch (err) {
    if ((err as { code?: string })?.code === "23505") {
      res.status(409).json({ error: "A post with that slug already exists" });
    } else {
      throw err;
    }
  }
});

// Dedicated publish/unpublish toggle
router.post("/admin/blog/posts/:id/publish", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const [existing] = await db
    .select({ id: blogPostsTable.id, status: blogPostsTable.status })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  const newStatus = existing.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  const publishedAt = newStatus === "PUBLISHED" ? new Date() : null;

  const [updated] = await db
    .update(blogPostsTable)
    .set({ status: newStatus, publishedAt, updatedAt: new Date() })
    .where(eq(blogPostsTable.id, id))
    .returning();

  res.json({ status: updated.status, publishedAt: updated.publishedAt?.toISOString() ?? null });
});

router.delete("/admin/blog/posts/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const deleted = await db.delete(blogPostsTable).where(eq(blogPostsTable.id, id)).returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({ message: "Post deleted" });
});

export default router;
