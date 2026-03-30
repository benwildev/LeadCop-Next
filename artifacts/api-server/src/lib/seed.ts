import { db, planConfigsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const DEFAULT_PLAN_CONFIGS = [
  {
    plan: "FREE" as const,
    requestLimit: 10,
    mxDetectLimit: 0,
    inboxCheckLimit: 0,
    websiteLimit: 0,
    pageLimit: 0,
    mxDetectionEnabled: false,
    inboxCheckEnabled: false,
  },
  {
    plan: "BASIC" as const,
    requestLimit: 1000,
    mxDetectLimit: 100,
    inboxCheckLimit: 0,
    websiteLimit: 1,
    pageLimit: 10,
    mxDetectionEnabled: true,
    inboxCheckEnabled: false,
  },
  {
    plan: "PRO" as const,
    requestLimit: 10000,
    mxDetectLimit: 0,
    inboxCheckLimit: 0,
    websiteLimit: 10,
    pageLimit: 100,
    mxDetectionEnabled: true,
    inboxCheckEnabled: true,
  },
];

export async function seedPlanConfigs(): Promise<void> {
  await db
    .insert(planConfigsTable)
    .values(DEFAULT_PLAN_CONFIGS)
    .onConflictDoNothing();
}
