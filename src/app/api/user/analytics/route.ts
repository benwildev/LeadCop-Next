import { NextRequest, NextResponse } from "next/server";
import { db, apiUsageTable } from "@/lib/db";
import { eq, sql, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const planConfig = await getPlanConfig(user.plan ?? "FREE");

    const dailyCalls = await db
      .select({
        date: sql<string>`DATE(${apiUsageTable.timestamp})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          sql`${apiUsageTable.timestamp} >= NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${apiUsageTable.timestamp})`)
      .orderBy(sql`DATE(${apiUsageTable.timestamp}) ASC`);

    const [monthTotalResult] = await db
      .select({ monthTotal: sql<number>`COUNT(*)::int` })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          sql`DATE_TRUNC('month', ${apiUsageTable.timestamp}) = DATE_TRUNC('month', NOW())`
        )
      );

    const monthTotal = Number(monthTotalResult?.monthTotal ?? 0);

    if (!planConfig.hasAdvancedAnalytics) {
      return NextResponse.json({
        dailyCalls: dailyCalls.map((d: any) => ({ date: d.date, count: Number(d.count) })),
        monthTotal,
        limited: true,
      });
    }

    const [totalChecksResult] = await db
      .select({ totalChecks: sql<number>`COUNT(*)::int` })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          sql`${apiUsageTable.isDisposable} IS NOT NULL`
        )
      );

    const [disposableCountResult] = await db
      .select({ disposableCount: sql<number>`COUNT(*)::int` })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          eq(apiUsageTable.isDisposable, true)
        )
      );

    const totalChecks = Number(totalChecksResult?.totalChecks ?? 0);
    const disposableCount = Number(disposableCountResult?.disposableCount ?? 0);
    const disposableRate = totalChecks > 0 ? Math.round((disposableCount / totalChecks) * 100) : 0;

    const topBlockedDomains = await db
      .select({
        domain: apiUsageTable.domain,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(apiUsageTable)
      .where(
        and(
          eq(apiUsageTable.userId, user.id),
          eq(apiUsageTable.isDisposable, true),
          sql`${apiUsageTable.domain} IS NOT NULL`
        )
      )
      .groupBy(apiUsageTable.domain)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    return NextResponse.json({
      dailyCalls: dailyCalls.map((d: any) => ({ date: d.date, count: Number(d.count) })),
      monthTotal,
      disposableRate,
      disposableCount,
      totalChecked: totalChecks,
      topBlockedDomains: topBlockedDomains.map((d: any) => ({ domain: d.domain ?? "", count: Number(d.count) })),
      limited: false,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
