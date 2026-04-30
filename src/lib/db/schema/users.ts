import { pgTable, serial, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").notNull().unique(),
  role: roleEnum("role").notNull().default("USER"),
  plan: text("plan").notNull().default("FREE"),
  requestCount: integer("request_count").notNull().default(0),
  requestLimit: integer("request_limit").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  usagePeriodStart: timestamp("usage_period_start").notNull().defaultNow(),
  blockFreeEmails: boolean("block_free_emails").notNull().default(false),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  parentId: integer("parent_id"), // NULL for master account, set to master account's ID for sub-users
  avatarUrl: text("avatar_url"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
