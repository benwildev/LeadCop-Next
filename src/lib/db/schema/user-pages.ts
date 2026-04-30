import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const userPagesTable = pgTable(
  "user_pages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("user_pages_user_id_path_idx").on(table.userId, table.path)]
);

export const insertUserPageSchema = createInsertSchema(userPagesTable).omit({ id: true, createdAt: true });
export type InsertUserPage = z.infer<typeof insertUserPageSchema>;
export type UserPage = typeof userPagesTable.$inferSelect;
