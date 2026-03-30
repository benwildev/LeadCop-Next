import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const upgradeStatusEnum = pgEnum("upgrade_status", ["PENDING", "APPROVED", "REJECTED"]);
export const upgradePlanEnum = pgEnum("upgrade_plan", ["BASIC", "PRO"]);

export const upgradeRequestsTable = pgTable("upgrade_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  planRequested: upgradePlanEnum("plan_requested").notNull(),
  status: upgradeStatusEnum("status").notNull().default("PENDING"),
  note: text("note"),
  invoiceKey: text("invoice_key"),
  invoiceFileName: text("invoice_file_name"),
  invoiceUploadedAt: timestamp("invoice_uploaded_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUpgradeRequestSchema = createInsertSchema(upgradeRequestsTable).omit({ id: true, createdAt: true, status: true });
export type InsertUpgradeRequest = z.infer<typeof insertUpgradeRequestSchema>;
export type UpgradeRequest = typeof upgradeRequestsTable.$inferSelect;
