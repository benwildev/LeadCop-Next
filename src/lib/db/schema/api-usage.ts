import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const apiUsageTable = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  endpoint: text("endpoint").notNull(),
  email: text("email"),
  domain: text("domain"),
  isDisposable: boolean("is_disposable"),
  reputationScore: integer("reputation_score"),
  source: text("source"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertApiUsageSchema = createInsertSchema(apiUsageTable).omit({ id: true, timestamp: true });
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type ApiUsage = typeof apiUsageTable.$inferSelect;
