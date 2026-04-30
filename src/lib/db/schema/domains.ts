import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const domainsTable = pgTable("domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  source: text("source").notNull().default("github"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDomainSchema = createInsertSchema(domainsTable).omit({ id: true, createdAt: true });
export type InsertDomain = z.infer<typeof insertDomainSchema>;
export type Domain = typeof domainsTable.$inferSelect;
