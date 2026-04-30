import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const blogPostStatusEnum = pgEnum("blog_post_status", ["DRAFT", "PUBLISHED"]);

export const blogPostsTable = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull().default(""),
  content: text("content").notNull().default(""),
  author: text("author").notNull().default("LeadCop Team"),
  coverImage: text("cover_image"),
  coverImageAlt: text("cover_image_alt"),
  tags: text("tags").notNull().default(""),
  status: blogPostStatusEnum("status").notNull().default("DRAFT"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ogImage: text("og_image"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BlogPost = typeof blogPostsTable.$inferSelect;
export type InsertBlogPost = typeof blogPostsTable.$inferInsert;
