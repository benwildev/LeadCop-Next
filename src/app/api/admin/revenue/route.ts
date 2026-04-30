import { NextResponse } from "next/server";
import { db, usersTable, planConfigsTable, upgradeRequestsTable } from "@/lib/db";
import { eq, sql, count, desc, and, gte } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const planConfigs = await db.select().from(planConfigsTable);
    const priceMap: Record<string, number> = {};
    for (const pc of planConfigs) {
      priceMap[pc.plan] = pc.price;
    }

    const planCounts = await db
      .select({ plan: usersTable.plan, count: count() })
      .from(usersTable)
      .groupBy(usersTable.plan);

    const userCountByPlan: Record<string, number> = {};
    for (const row of planCounts) {
      if (row.plan) userCountByPlan[row.plan] = Number(row.count);
    }

    let mrr = 0;
    const revenueByPlan = planConfigs.map((pc: any) => {
      const userCount = userCountByPlan[pc.plan] || 0;
      const revenue = pc.price * userCount;
      if (pc.plan !== "FREE") mrr += revenue;
      return { plan: pc.plan, price: pc.price, userCount, revenue };
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRaw = await db
      .select({
        month: sql<string>`to_char(${upgradeRequestsTable.approvedAt}, 'YYYY-MM')`,
        count: count(),
      })
      .from(upgradeRequestsTable)
      .where(and(
        eq(upgradeRequestsTable.status, "APPROVED"),
        gte(upgradeRequestsTable.approvedAt, twelveMonthsAgo),
      ))
      .groupBy(sql`to_char(${upgradeRequestsTable.approvedAt}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${upgradeRequestsTable.approvedAt}, 'YYYY-MM')`);

    const monthlyMap: Record<string, number> = {};
    for (const row of monthlyRaw) {
      if (row.month) monthlyMap[row.month] = Number(row.count);
    }

    const monthlySubs: { month: string; count: number }[] = [];
    const now = new Date();
    const baseYear = now.getFullYear();
    const baseMonth = now.getMonth();
    for (let i = 11; i >= 0; i--) {
      let m = baseMonth - i;
      let y = baseYear;
      while (m < 0) { m += 12; y--; }
      const key = `${y}-${String(m + 1).padStart(2, "0")}`;
      monthlySubs.push({ month: key, count: monthlyMap[key] || 0 });
    }

    const recentRaw = await db
      .select({
        id: upgradeRequestsTable.id,
        userName: usersTable.name,
        userEmail: usersTable.email,
        plan: upgradeRequestsTable.planRequested,
        approvedAt: upgradeRequestsTable.approvedAt,
      })
      .from(upgradeRequestsTable)
      .leftJoin(usersTable, eq(upgradeRequestsTable.userId, usersTable.id))
      .where(eq(upgradeRequestsTable.status, "APPROVED"))
      .orderBy(desc(upgradeRequestsTable.approvedAt))
      .limit(20);

    const recent = recentRaw.map((r: any) => ({
      id: r.id,
      userName: r.userName || "Unknown",
      userEmail: r.userEmail || "Unknown",
      plan: r.plan,
      price: r.plan ? (priceMap[r.plan] || 0) : 0,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
    }));

    const totalPaidUsers = planCounts
      .filter((r) => r.plan !== "FREE")
      .reduce((a, b: any) => a + Number(b.count), 0);

    return NextResponse.json({ mrr, totalPaidUsers, revenueByPlan, monthlySubs, recent });
  } catch (err) {
    console.error("[Revenue API Error]", err);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
