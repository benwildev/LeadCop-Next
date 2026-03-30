import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userWebsitesTable = pgTable(
  "user_websites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_websites_user_id_domain_idx").on(table.userId, table.domain)]
);

export const insertUserWebsiteSchema = createInsertSchema(userWebsitesTable).omit({ id: true, createdAt: true });
export type InsertUserWebsite = z.infer<typeof insertUserWebsiteSchema>;
export type UserWebsite = typeof userWebsitesTable.$inferSelect;
