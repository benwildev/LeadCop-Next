import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { db, planConfigsTable } from "@workspace/db";
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

export function getRequestLimit(plan: string): number {
  switch (plan) {
    case "BASIC": return 1000;
    case "PRO": return 10000;
    default: return 10;
  }
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
      requestLimit: getRequestLimit(plan),
      mxDetectLimit: 0,
      inboxCheckLimit: 0,
      websiteLimit: 0,
      pageLimit: 0,
      mxDetectionEnabled: false,
      inboxCheckEnabled: false,
    };
  }
  return config;
}
