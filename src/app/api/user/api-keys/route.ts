import { NextRequest, NextResponse } from "next/server";
import { db, userApiKeysTable, usersTable } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { generateApiKey } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const keys = await db
      .select({
        id: userApiKeysTable.id,
        name: userApiKeysTable.name,
        key: userApiKeysTable.key,
        createdAt: userApiKeysTable.createdAt,
      })
      .from(userApiKeysTable)
      .where(eq(userApiKeysTable.userId, user.id))
      .orderBy(userApiKeysTable.createdAt);

    return NextResponse.json({
      keys: keys.map((k: any) => ({
        id: k.id,
        name: k.name,
        maskedKey: `${k.key.slice(0, 6)}${"*".repeat(20)}`,
        createdAt: k.createdAt.toISOString(),
      })),
      total: keys.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
});

const MAX_KEYS_PER_PLAN: Record<string, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 10,
};

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = createApiKeySchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Name is required (max 80 characters)" }, { status: 400 });

    const maxKeys = MAX_KEYS_PER_PLAN[user.plan ?? "FREE"] ?? 10;
    const [keyCountResult] = await db
      .select({ keyCount: count() })
      .from(userApiKeysTable)
      .where(eq(userApiKeysTable.userId, user.id));

    if (Number(keyCountResult?.keyCount ?? 0) >= maxKeys) {
      return NextResponse.json({
        error: `API key limit reached (${maxKeys}) for your plan. Please upgrade to create more keys.`,
      }, { status: 429 });
    }

    const key = generateApiKey();
    const [inserted] = await db
      .insert(userApiKeysTable)
      .values({ userId: user.id, name: result.data.name, key })
      .returning();

    return NextResponse.json({
      key: {
        id: inserted.id,
        name: inserted.name,
        key: inserted.key,
        maskedKey: `${inserted.key.slice(0, 6)}${"*".repeat(20)}`,
        createdAt: inserted.createdAt.toISOString(),
      },
      message: "API key created successfully",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
