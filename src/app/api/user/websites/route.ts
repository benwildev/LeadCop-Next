import { NextRequest, NextResponse } from "next/server";
import { db, userWebsitesTable, usersTable } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const websites = await db
      .select()
      .from(userWebsitesTable)
      .where(eq(userWebsitesTable.userId, user.id))
      .orderBy(userWebsitesTable.createdAt);

    return NextResponse.json({
      websites: websites.map((w: any) => ({ ...w, createdAt: w.createdAt.toISOString() })),
      total: websites.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const addWebsiteSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");

    const [websiteCountResult] = await db
      .select({ websiteCount: count() })
      .from(userWebsitesTable)
      .where(eq(userWebsitesTable.userId, user.id));

    if (planConfig.websiteLimit === 0) {
      return NextResponse.json({
        error: "Website tracking is not available on your current plan. Please upgrade.",
      }, { status: 403 });
    }

    if (Number(websiteCountResult?.websiteCount ?? 0) >= planConfig.websiteLimit) {
      return NextResponse.json({
        error: `Website limit reached (${planConfig.websiteLimit}). Please upgrade your plan.`,
      }, { status: 429 });
    }

    const body = await req.json();
    const result = addWebsiteSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });

    const { domain } = result.data;

    const [existing] = await db
      .select()
      .from(userWebsitesTable)
      .where(eq(userWebsitesTable.domain, domain))
      .limit(1);

    if (existing) return NextResponse.json({ error: "Domain already added" }, { status: 409 });

    const [inserted] = await db
      .insert(userWebsitesTable)
      .values({ userId: user.id, domain })
      .returning();

    return NextResponse.json({
      website: { ...inserted, createdAt: inserted.createdAt.toISOString() },
      message: "Domain added",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
