import { NextRequest, NextResponse } from "next/server";
import { db, customBlocklistTable } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const entries = await db
      .select()
      .from(customBlocklistTable)
      .where(eq(customBlocklistTable.userId, user.id))
      .orderBy(customBlocklistTable.createdAt);

    return NextResponse.json({
      entries: entries.map((e: any) => ({ ...e, createdAt: e.createdAt.toISOString() })),
      total: entries.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const addBlocklistSchema = z.object({
  domain: z.string().min(1).regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid domain format"),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    if (!planConfig.hasCustomBlocklist) {
      return NextResponse.json({
        error: "Custom blocklists are not available on the FREE plan. Upgrade to BASIC or PRO to manage your blocklist.",
        planRequired: "BASIC",
      }, { status: 403 });
    }

    const body = await req.json();
    const result = addBlocklistSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });

    const domain = result.data.domain.toLowerCase();

    const [existing] = await db
      .select({ id: customBlocklistTable.id })
      .from(customBlocklistTable)
      .where(and(eq(customBlocklistTable.userId, user.id), eq(customBlocklistTable.domain, domain)))
      .limit(1);

    if (existing) return NextResponse.json({ error: "Domain already in blocklist" }, { status: 409 });

    const [inserted] = await db
      .insert(customBlocklistTable)
      .values({ userId: user.id, domain })
      .returning();

    return NextResponse.json({
      entry: { ...inserted, createdAt: inserted.createdAt.toISOString() },
      message: "Domain added to blocklist",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
