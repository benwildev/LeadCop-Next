import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const emailSettingsTable = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  fromName: text("from_name").notNull().default("TempShield"),
  fromEmail: text("from_email"),
  notifyOnSubmit: boolean("notify_on_submit").notNull().default(true),
  notifyOnDecision: boolean("notify_on_decision").notNull().default(true),
  notifyAdminOnNewTicket: boolean("notify_admin_on_new_ticket").notNull().default(true),
  notifyUserOnTicketCreated: boolean("notify_user_on_ticket_created").notNull().default(true),
  notifyAdminOnNewSubscriber: boolean("notify_admin_on_new_subscriber").notNull().default(true),
  adminEmail: text("admin_email"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EmailSettings = typeof emailSettingsTable.$inferSelect;
