import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const customBlocklistTable = pgTable(
  "custom_blocklist",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("custom_blocklist_user_domain_idx").on(table.userId, table.domain)]
);

export const insertCustomBlocklistSchema = createInsertSchema(customBlocklistTable).omit({ id: true, createdAt: true });
export type InsertCustomBlocklist = z.infer<typeof insertCustomBlocklistSchema>;
export type CustomBlocklist = typeof customBlocklistTable.$inferSelect;
