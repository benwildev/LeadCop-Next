import { pgTable, serial, integer, boolean, text, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planConfigsTable = pgTable("plan_configs", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull().unique(),
  requestLimit: integer("request_limit").notNull().default(10),
  dataLimit: integer("data_limit").notNull().default(0),
  websiteLimit: integer("website_limit").notNull().default(0),
  price: doublePrecision("price").default(0).notNull(),
  rateLimitPerSecond: integer("rate_limit_per_second").notNull().default(1),
  maxApiKeys: integer("max_api_keys").notNull().default(1),
  maxUsers: integer("max_users").notNull().default(1), // Includes the master account (e.g. 2 means 1 sub-user)
  logRetentionDays: integer("log_retention_days").notNull().default(7), // -1 for unlimited
  hasBulkValidation: boolean("has_bulk_validation").notNull().default(false),
  bulkEmailLimit: integer("bulk_email_limit").notNull().default(0), // 0=disabled, -1=unlimited, N=max emails per job
  hasWebhooks: boolean("has_webhooks").notNull().default(false),
  hasCustomBlocklist: boolean("has_custom_blocklist").notNull().default(false),
  hasAdvancedAnalytics: boolean("has_advanced_analytics").notNull().default(false),
  description: text("description"),
  features: text("features").array().notNull().default([]),
});

export const insertPlanConfigSchema = createInsertSchema(planConfigsTable).omit({ id: true });
export type InsertPlanConfig = z.infer<typeof insertPlanConfigSchema>;
export type PlanConfig = typeof planConfigsTable.$inferSelect;
