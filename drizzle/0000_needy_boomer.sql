CREATE TYPE "public"."role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."upgrade_plan" AS ENUM('BASIC', 'PRO');--> statement-breakpoint
CREATE TYPE "public"."upgrade_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."support_message_sender_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_category" AS ENUM('general', 'billing', 'technical', 'feature');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."blog_post_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('DRAFT', 'SENDING', 'SENT');--> statement-breakpoint
CREATE TYPE "public"."newsletter_status" AS ENUM('ACTIVE', 'UNSUBSCRIBED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"api_key" text NOT NULL,
	"role" "role" DEFAULT 'USER' NOT NULL,
	"plan" text DEFAULT 'FREE' NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"request_limit" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"usage_period_start" timestamp DEFAULT now() NOT NULL,
	"block_free_emails" boolean DEFAULT false NOT NULL,
	"reset_token" text,
	"reset_token_expires_at" timestamp,
	"parent_id" integer,
	"avatar_url" text,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"endpoint" text NOT NULL,
	"email" text,
	"domain" text,
	"is_disposable" boolean,
	"reputation_score" integer,
	"source" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"source" text DEFAULT 'github' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "upgrade_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_requested" "upgrade_plan" NOT NULL,
	"status" "upgrade_status" DEFAULT 'PENDING' NOT NULL,
	"note" text,
	"invoice_key" text,
	"invoice_file_name" text,
	"invoice_uploaded_at" timestamp,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan" text NOT NULL,
	"request_limit" integer DEFAULT 10 NOT NULL,
	"data_limit" integer DEFAULT 0 NOT NULL,
	"website_limit" integer DEFAULT 0 NOT NULL,
	"price" double precision DEFAULT 0 NOT NULL,
	"rate_limit_per_second" integer DEFAULT 1 NOT NULL,
	"max_api_keys" integer DEFAULT 1 NOT NULL,
	"max_users" integer DEFAULT 1 NOT NULL,
	"log_retention_days" integer DEFAULT 7 NOT NULL,
	"has_bulk_validation" boolean DEFAULT false NOT NULL,
	"bulk_email_limit" integer DEFAULT 0 NOT NULL,
	"has_webhooks" boolean DEFAULT false NOT NULL,
	"has_custom_blocklist" boolean DEFAULT false NOT NULL,
	"has_advanced_analytics" boolean DEFAULT false NOT NULL,
	"description" text,
	"features" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "plan_configs_plan_unique" UNIQUE("plan")
);
--> statement-breakpoint
CREATE TABLE "user_websites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"events" text[] DEFAULT '{"email.detected"}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_blocklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway" text DEFAULT 'MANUAL' NOT NULL,
	"stripe_enabled" boolean DEFAULT false NOT NULL,
	"stripe_publishable_key" text,
	"stripe_secret_key" text,
	"stripe_webhook_secret" text,
	"paypal_enabled" boolean DEFAULT false NOT NULL,
	"paypal_client_id" text,
	"paypal_secret" text,
	"paypal_mode" text DEFAULT 'sandbox' NOT NULL,
	"plan_prices" jsonb DEFAULT '{"BASIC":9,"PRO":29}'::jsonb,
	"free_verify_limit" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"smtp_host" text,
	"smtp_port" integer DEFAULT 587 NOT NULL,
	"smtp_user" text,
	"smtp_pass" text,
	"smtp_secure" boolean DEFAULT false NOT NULL,
	"from_name" text DEFAULT 'LeadCop' NOT NULL,
	"from_email" text,
	"notify_on_submit" boolean DEFAULT true NOT NULL,
	"notify_on_decision" boolean DEFAULT true NOT NULL,
	"notify_admin_on_new_ticket" boolean DEFAULT true NOT NULL,
	"notify_user_on_ticket_created" boolean DEFAULT true NOT NULL,
	"notify_admin_on_new_subscriber" boolean DEFAULT true NOT NULL,
	"notify_user_on_ticket_status_change" boolean DEFAULT true NOT NULL,
	"admin_email" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_seo" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"meta_title" text,
	"meta_description" text,
	"keywords" text,
	"og_title" text,
	"og_description" text,
	"og_image" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "page_seo_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_title" text DEFAULT 'LeadCop' NOT NULL,
	"tagline" text DEFAULT 'Block Fake Emails. Protect Your Platform.' NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"global_meta_title" text DEFAULT 'LeadCop — Disposable Email Detection API' NOT NULL,
	"global_meta_description" text DEFAULT 'Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy.' NOT NULL,
	"footer_text" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"emails" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_emails" integer NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"disposable_count" integer DEFAULT 0 NOT NULL,
	"safe_count" integer DEFAULT 0 NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"sender_role" "support_message_sender_role" NOT NULL,
	"message" text NOT NULL,
	"attachment_url" text,
	"attachment_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"subject" text NOT NULL,
	"category" "support_ticket_category" DEFAULT 'general' NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"author" text DEFAULT 'LeadCop Team' NOT NULL,
	"cover_image" text,
	"cover_image_alt" text,
	"tags" text DEFAULT '' NOT NULL,
	"status" "blog_post_status" DEFAULT 'DRAFT' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "newsletter_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"preview_text" text,
	"html_content" text NOT NULL,
	"status" "campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" "newsletter_status" DEFAULT 'ACTIVE' NOT NULL,
	"token" text NOT NULL,
	"subscribed_at" timestamp DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "newsletter_subscribers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "whitelist" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whitelist_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upgrade_requests" ADD CONSTRAINT "upgrade_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_websites" ADD CONSTRAINT "user_websites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_pages" ADD CONSTRAINT "user_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_blocklist" ADD CONSTRAINT "custom_blocklist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bulk_jobs" ADD CONSTRAINT "bulk_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_websites_user_id_domain_idx" ON "user_websites" USING btree ("user_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "user_pages_user_id_path_idx" ON "user_pages" USING btree ("user_id","path");--> statement-breakpoint
CREATE UNIQUE INDEX "custom_blocklist_user_domain_idx" ON "custom_blocklist" USING btree ("user_id","domain");--> statement-breakpoint
CREATE UNIQUE INDEX "whitelist_domain_idx" ON "whitelist" USING btree ("domain");