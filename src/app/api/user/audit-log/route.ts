import { NextRequest, NextResponse } from "next/server";
import { db, apiUsageTable } from "@/lib/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50")));
  const offset = (page - 1) * limit;

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");
    const retentionCondition = planConfig.logRetentionDays === -1
      ? undefined
      : sql`${apiUsageTable.timestamp} >= NOW() - INTERVAL '${planConfig.logRetentionDays} days'`;

    const [totalResult] = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          retentionCondition
        )
      );

    const entries = await db
      .select({
        id: apiUsageTable.id,
        endpoint: apiUsageTable.endpoint,
        email: apiUsageTable.email,
        domain: apiUsageTable.domain,
        isDisposable: apiUsageTable.isDisposable,
        reputationScore: apiUsageTable.reputationScore,
        source: apiUsageTable.source,
        timestamp: apiUsageTable.timestamp,
      })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          retentionCondition
        )
      )
      .orderBy(desc(apiUsageTable.timestamp))
      .limit(limit)
      .offset(offset);

    const total = Number(totalResult?.total ?? 0);

    return NextResponse.json({
      entries: entries.map((e: any) => ({ ...e, timestamp: e.timestamp.toISOString() })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      isLimited: planConfig.logRetentionDays !== -1,
      retentionDays: planConfig.logRetentionDays,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
