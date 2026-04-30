import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const whitelistTable = pgTable(
  "whitelist",
  {
    id: serial("id").primaryKey(),
    domain: text("domain").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("whitelist_domain_idx").on(table.domain)]
);

export const insertWhitelistSchema = createInsertSchema(whitelistTable).omit({ id: true, createdAt: true });
export type InsertWhitelist = z.infer<typeof insertWhitelistSchema>;
export type Whitelist = typeof whitelistTable.$inferSelect;
