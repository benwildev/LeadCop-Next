import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, apiUsageTable, userApiKeysTable, webhooksTable, customBlocklistTable } from "@/lib/db";
import { eq, desc, sql, count } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [userData] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        apiKey: usersTable.apiKey,
        role: usersTable.role,
        plan: usersTable.plan,
        requestCount: usersTable.requestCount,
        requestLimit: usersTable.requestLimit,
        createdAt: usersTable.createdAt,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const recentUsage = await db
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
      .where(eq(apiUsageTable.userId, user.id))
      .orderBy(desc(apiUsageTable.timestamp))
      .limit(10);

    const usageByDay = await db
      .select({
        date: sql<string>`DATE(${apiUsageTable.timestamp})::text`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(apiUsageTable)
      .where(eq(apiUsageTable.userId, user.id))
      .groupBy(sql`DATE(${apiUsageTable.timestamp})`)
      .orderBy(sql`DATE(${apiUsageTable.timestamp}) DESC`)
      .limit(30);

    const planConfig = await getPlanConfig(userData.plan ?? "FREE");

    const [keyCountResult] = await db
      .select({ keyCount: count() })
      .from(userApiKeysTable)
      .where(eq(userApiKeysTable.userId, user.id));

    const [webhookCountResult] = await db
      .select({ webhookCount: count() })
      .from(webhooksTable)
      .where(eq(webhooksTable.userId, user.id));

    const [blocklistCountResult] = await db
      .select({ blocklistCount: count() })
      .from(customBlocklistTable)
      .where(eq(customBlocklistTable.userId, user.id));

    return NextResponse.json({
      user: { ...userData, createdAt: userData.createdAt.toISOString() },
      recentUsage: recentUsage.map((u: any) => ({ ...u, timestamp: u.timestamp.toISOString() })),
      usageByDay: usageByDay.map((u: any) => ({ date: u.date, count: Number(u.count) })),
      planConfig: {
        websiteLimit: planConfig.websiteLimit,
        dataLimit: planConfig.dataLimit,
        maxApiKeys: planConfig.maxApiKeys,
        maxUsers: planConfig.maxUsers,
        logRetentionDays: planConfig.logRetentionDays,
        rateLimitPerSecond: planConfig.rateLimitPerSecond,
        hasBulkValidation: planConfig.hasBulkValidation,
        bulkEmailLimit: planConfig.bulkEmailLimit,
        hasWebhooks: planConfig.hasWebhooks,
        hasCustomBlocklist: planConfig.hasCustomBlocklist,
        hasAdvancedAnalytics: planConfig.hasAdvancedAnalytics,
        requestLimit: planConfig.requestLimit,
      },
      counts: {
        namedApiKeys: Number(keyCountResult?.keyCount ?? 0),
        webhooks: Number(webhookCountResult?.webhookCount ?? 0),
        blocklist: Number(blocklistCountResult?.blocklistCount ?? 0),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
