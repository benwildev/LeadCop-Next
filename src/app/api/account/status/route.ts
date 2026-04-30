import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, userApiKeysTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";
import { maybeResetMonthlyUsage } from "@/lib/backend/auth"; // Need to ensure this utility is exported

export async function GET(req: NextRequest) {
  let userId: number | null = null;

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);

    const [user] = await db
      .select({ 
        id: usersTable.id, 
        requestCount: usersTable.requestCount, 
        plan: usersTable.plan, 
        usagePeriodStart: usersTable.usagePeriodStart 
      })
      .from(usersTable)
      .where(eq(usersTable.apiKey, apiKey))
      .limit(1);

    if (user) {
      await maybeResetMonthlyUsage(user.id, user.usagePeriodStart, user.requestCount);
      userId = user.id;
    } else {
      const [namedKey] = await db
        .select({ userId: userApiKeysTable.userId })
        .from(userApiKeysTable)
        .where(eq(userApiKeysTable.key, apiKey))
        .limit(1);
      if (namedKey) userId = namedKey.userId;
    }
  } else {
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      userId = sessionUser.id;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      plan: usersTable.plan,
      requestCount: usersTable.requestCount,
      requestLimit: usersTable.requestLimit,
      usagePeriodStart: usersTable.usagePeriodStart,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const planConfig = await getPlanConfig(user.plan ?? "FREE");

  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return NextResponse.json({
    plan: user.plan,
    requestsUsed: user.requestCount,
    requestLimit: user.requestLimit,
    resetDate: resetDate.toISOString(),
    features: {
      mxDetection: true,
      inboxCheck: true,
      bulkVerification: planConfig.hasBulkValidation,
      bulkEmailLimit: planConfig.bulkEmailLimit,
      dataLimit: planConfig.dataLimit,
      dnsblCheck: planConfig.hasAdvancedAnalytics,
      webhooks: planConfig.hasWebhooks,
      customBlocklist: planConfig.hasCustomBlocklist,
      maxUsers: planConfig.maxUsers,
      maxApiKeys: planConfig.maxApiKeys,
    },
  });
}
