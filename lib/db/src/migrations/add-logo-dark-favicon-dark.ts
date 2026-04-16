/**
 * Idempotent migration: add logo_dark_url and favicon_dark_url columns to
 * site_settings table to support separate light/dark mode branding assets.
 *
 * Both columns are nullable (NULL = fall back to the light variant).
 * Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
 *
 * Run: pnpm --filter @workspace/db run migrate:add-logo-dark-favicon-dark
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function migrate() {
  await db.execute(sql`
    ALTER TABLE site_settings
    ADD COLUMN IF NOT EXISTS logo_dark_url TEXT
  `);
  console.log("✓ logo_dark_url column ensured on site_settings");

  await db.execute(sql`
    ALTER TABLE site_settings
    ADD COLUMN IF NOT EXISTS favicon_dark_url TEXT
  `);
  console.log("✓ favicon_dark_url column ensured on site_settings");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
