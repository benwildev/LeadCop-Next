/**
 * Idempotent migration: ensure site_settings and page_seo tables exist
 * and seed the default site_settings singleton row (id=1).
 *
 * Tables are already created via drizzle-kit push, but this script
 * provides a repeatable, auditable migration artifact.
 *
 * Run: pnpm --filter @workspace/db run migrate:seed-site-settings
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function migrate() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      id           SERIAL PRIMARY KEY,
      site_title   TEXT NOT NULL DEFAULT 'TempShield',
      tagline      TEXT NOT NULL DEFAULT 'Block Fake Emails. Protect Your Platform.',
      logo_url     TEXT,
      favicon_url  TEXT,
      global_meta_title       TEXT NOT NULL DEFAULT 'LeadCop — Disposable Email Detection API',
      global_meta_description TEXT NOT NULL DEFAULT 'Industry-leading disposable email detection API. Real-time verification with 99.9% accuracy.',
      footer_text  TEXT,
      updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ site_settings table ensured");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS page_seo (
      id               SERIAL PRIMARY KEY,
      slug             TEXT NOT NULL UNIQUE,
      meta_title       TEXT,
      meta_description TEXT,
      keywords         TEXT,
      og_title         TEXT,
      og_description   TEXT,
      og_image         TEXT,
      updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  console.log("✓ page_seo table ensured");

  await db.execute(sql`
    INSERT INTO site_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);
  console.log("✓ site_settings default row seeded");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
