import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db, planConfigsTable, usersTable } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateApiKey(): string {
  return `ts_${uuidv4().replace(/-/g, "")}`;
}

export async function getPlanConfig(plan: string) {
  const [config] = await db
    .select()
    .from(planConfigsTable)
    .where(eq(planConfigsTable.plan, plan))
    .limit(1);

  if (!config) {
    return {
      plan,
      requestLimit: 100,
      dataLimit: 0,
      websiteLimit: 0,
      price: 0,
      rateLimitPerSecond: 1,
      maxUsers: 1,
      logRetentionDays: 7,
      hasBulkValidation: false,
      bulkEmailLimit: 0,
      hasWebhooks: false,
      hasCustomBlocklist: false,
      hasAdvancedAnalytics: false,
      maxApiKeys: 1,
      description: null,
      features: [],
    };
  }

  return config;
}

export async function maybeResetMonthlyUsage(userId: number, periodStart: Date, currentUsage: number) {
  const now = new Date();
  if (
    now.getFullYear() > periodStart.getFullYear() ||
    now.getMonth() > periodStart.getMonth()
  ) {
    await db
      .update(usersTable)
      .set({ 
        requestCount: 0, 
        usagePeriodStart: new Date(now.getFullYear(), now.getMonth(), 1) 
      })
      .where(eq(usersTable.id, userId));
    return true;
  }
  return false;
}
