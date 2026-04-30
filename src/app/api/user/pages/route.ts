import { NextRequest, NextResponse } from "next/server";
import { db, userPagesTable } from "@/lib/db";
import { eq, count, and } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const pages = await db
      .select()
      .from(userPagesTable)
      .where(eq(userPagesTable.userId, user.id))
      .orderBy(userPagesTable.createdAt);

    return NextResponse.json({
      pages: pages.map((p: any) => ({ ...p, createdAt: p.createdAt.toISOString() })),
      total: pages.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const addPageSchema = z.object({
  path: z.string().min(1).regex(/^\/.*/, "Path must start with /"),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");

    const [pageCountResult] = await db
      .select({ pageCount: count() })
      .from(userPagesTable)
      .where(eq(userPagesTable.userId, user.id));

    if (planConfig.dataLimit === 0 && user.plan !== "PRO") {
      return NextResponse.json({
        error: "Page tracking is not available on your current plan. Please upgrade.",
      }, { status: 403 });
    }

    if (Number(pageCountResult?.pageCount ?? 0) >= (planConfig.dataLimit || 100)) {
      return NextResponse.json({
        error: `Page limit reached (${planConfig.dataLimit || 100}). Please upgrade your plan.`,
      }, { status: 429 });
    }

    const body = await req.json();
    const result = addPageSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Path must start with /" }, { status: 400 });

    const { path } = result.data;

    const [existing] = await db
      .select()
      .from(userPagesTable)
      .where(and(eq(userPagesTable.userId, user.id), eq(userPagesTable.path, path)))
      .limit(1);

    if (existing) return NextResponse.json({ error: "Page path already added" }, { status: 409 });

    const [inserted] = await db
      .insert(userPagesTable)
      .values({ userId: user.id, path })
      .returning();

    return NextResponse.json({
      page: { ...inserted, createdAt: inserted.createdAt.toISOString() },
      message: "Page added",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
