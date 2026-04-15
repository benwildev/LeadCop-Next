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
    maxBulkEmails: 0,
    mxDetectionEnabled: true,
    inboxCheckEnabled: true,
    price: 0,
  },
  {
    plan: "BASIC" as const,
    requestLimit: 1000,
    mxDetectLimit: 100,
    inboxCheckLimit: 0,
    websiteLimit: 1,
    pageLimit: 10,
    maxBulkEmails: 100,
    mxDetectionEnabled: true,
    inboxCheckEnabled: false,
    price: 9,
  },
  {
    plan: "PRO" as const,
    requestLimit: 10000,
    mxDetectLimit: 0,
    inboxCheckLimit: 0,
    websiteLimit: 10,
    pageLimit: 100,
    maxBulkEmails: 500,
    mxDetectionEnabled: true,
    inboxCheckEnabled: true,
    price: 29,
  },
];

export async function seedPlanConfigs(): Promise<void> {
  await db
    .insert(planConfigsTable)
    .values(DEFAULT_PLAN_CONFIGS)
    .onConflictDoNothing();
}
