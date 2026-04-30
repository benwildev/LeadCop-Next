import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteTitle: text("site_title").notNull().default("LeadCop"),
  tagline: text("tagline").notNull().default("Block Fake Emails. Protect Your Platform."),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  globalMetaTitle: text("global_meta_title").notNull().default("LeadCop — Disposable Email Detection API"),
  globalMetaDescription: text("global_meta_description").notNull().default("Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy."),
  footerText: text("footer_text"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const pageSeoTable = pgTable("page_seo", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  keywords: text("keywords"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
export type PageSeo = typeof pageSeoTable.$inferSelect;
