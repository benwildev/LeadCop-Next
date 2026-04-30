import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, apiUsageTable, domainsTable, upgradeRequestsTable } from "@/lib/db";
import { eq, sql, count, gte } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Access Denied" }, { status: 403 });
  }

  try {
    const [totalUsersResult] = await db.select({ count: count() }).from(usersTable);
    const [totalApiCallsResult] = await db.select({ count: count() }).from(apiUsageTable);
    const [totalDomainsResult] = await db.select({ count: count() }).from(domainsTable);
    const [pendingResult] = await db
      .select({ count: count() })
      .from(upgradeRequestsTable)
      .where(eq(upgradeRequestsTable.status, "PENDING"));

    const planCounts = await db
      .select({ plan: usersTable.plan, count: count() })
      .from(usersTable)
      .groupBy(usersTable.plan);

    const usersByPlan: Record<string, number> = {};
    for (const row of planCounts) {
      if (row.plan) {
        usersByPlan[row.plan] = Number(row.count);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const apiTrend = await db
      .select({
        date: sql<string>`DATE(${apiUsageTable.timestamp})`,
        count: count(),
      })
      .from(apiUsageTable)
      .where(gte(apiUsageTable.timestamp, thirtyDaysAgo))
      .groupBy(sql`DATE(${apiUsageTable.timestamp})`)
      .orderBy(sql`DATE(${apiUsageTable.timestamp})`);

    const userTrend = await db
      .select({
        date: sql<string>`DATE(${usersTable.createdAt})`,
        count: count(),
      })
      .from(usersTable)
      .where(gte(usersTable.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${usersTable.createdAt})`)
      .orderBy(sql`DATE(${usersTable.createdAt})`);

    const trendMap: Record<string, { calls: number; users: number }> = {};
    
    for (const item of apiTrend) {
      if (item.date) {
        if (!trendMap[item.date]) trendMap[item.date] = { calls: 0, users: 0 };
        trendMap[item.date].calls = Number(item.count);
      }
    }
    
    for (const item of userTrend) {
      if (item.date) {
        if (!trendMap[item.date]) trendMap[item.date] = { calls: 0, users: 0 };
        trendMap[item.date].users = Number(item.count);
      }
    }

    const trendData = Object.entries(trendMap)
      .map(([date, { calls, users }]) => ({
        date,
        month: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        calls,
        users,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      totalUsers: Number(totalUsersResult?.count || 0),
      totalApiCalls: Number(totalApiCallsResult?.count || 0),
      totalDomains: Number(totalDomainsResult?.count || 0),
      pendingUpgradeRequests: Number(pendingResult?.count || 0),
      usersByPlan,
      trendData,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
