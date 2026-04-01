import { pgTable, serial, integer, boolean, text, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planConfigsTable = pgTable("plan_configs", {
  id: serial("id").primaryKey(),
  plan: text("plan").notNull().unique(),
  requestLimit: integer("request_limit").notNull().default(10),
  mxDetectLimit: integer("mx_detect_limit").notNull().default(0),
  inboxCheckLimit: integer("inbox_check_limit").notNull().default(0),
  websiteLimit: integer("website_limit").notNull().default(0),
  pageLimit: integer("page_limit").notNull().default(0),
  maxBulkEmails: integer("max_bulk_emails").notNull().default(0),
  mxDetectionEnabled: boolean("mx_detection_enabled").notNull().default(false),
  inboxCheckEnabled: boolean("inbox_check_enabled").notNull().default(false),
  price: doublePrecision("price").default(0).notNull(),
});

export const insertPlanConfigSchema = createInsertSchema(planConfigsTable).omit({ id: true });
export type InsertPlanConfig = z.infer<typeof insertPlanConfigSchema>;
export type PlanConfig = typeof planConfigsTable.$inferSelect;
