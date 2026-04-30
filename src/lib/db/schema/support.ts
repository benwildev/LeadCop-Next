import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const supportTicketCategoryEnum = pgEnum("support_ticket_category", [
  "general", "billing", "technical", "feature",
]);

export const supportTicketStatusEnum = pgEnum("support_ticket_status", [
  "open", "in_progress", "resolved", "closed",
]);

export const supportMessageSenderRoleEnum = pgEnum("support_message_sender_role", [
  "user", "admin",
]);

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  subject: text("subject").notNull(),
  category: supportTicketCategoryEnum("category").notNull().default("general"),
  status: supportTicketStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const supportMessagesTable = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => supportTicketsTable.id),
  senderRole: supportMessageSenderRoleEnum("sender_role").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;
