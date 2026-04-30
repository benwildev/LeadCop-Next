import { pgTable, serial, integer, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export interface BulkJobResultItem {
  email: string;
  domain: string;
  isDisposable: boolean;
  reputationScore: number;
  riskLevel: string;
  tags: string[];
  isValidSyntax: boolean;
  isFreeEmail: boolean;
  isRoleAccount: boolean;
  mxValid: boolean | null;
  error?: string;
}

export const bulkJobsTable = pgTable("bulk_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  emails: jsonb("emails").$type<string[]>().notNull().default([]),
  totalEmails: integer("total_emails").notNull(),
  processedCount: integer("processed_count").notNull().default(0),
  disposableCount: integer("disposable_count").notNull().default(0),
  safeCount: integer("safe_count").notNull().default(0),
  results: jsonb("results").$type<BulkJobResultItem[]>().default([]),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type BulkJob = typeof bulkJobsTable.$inferSelect;
