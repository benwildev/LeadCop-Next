import { pgTable, serial, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const newsletterStatusEnum = pgEnum("newsletter_status", ["ACTIVE", "UNSUBSCRIBED"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["DRAFT", "SENDING", "SENT"]);

export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  status: newsletterStatusEnum("status").notNull().default("ACTIVE"),
  token: text("token").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
});

export const newsletterCampaignsTable = pgTable("newsletter_campaigns", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  previewText: text("preview_text"),
  htmlContent: text("html_content").notNull(),
  status: campaignStatusEnum("status").notNull().default("DRAFT"),
  recipientCount: integer("recipient_count").notNull().default(0),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
export type NewsletterCampaign = typeof newsletterCampaignsTable.$inferSelect;
