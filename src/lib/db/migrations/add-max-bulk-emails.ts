/**
 * Idempotent migration: add max_bulk_emails column to plan_configs table,
 * and backfill BASIC/PRO with sensible defaults so existing paid plans are not
 * silently disabled after the migration.
 *
 * Defaults:
 *   FREE   → 0   (disabled)
 *   BASIC  → 100 (matches previous hardcoded Zod max)
 *   PRO    → 500
 *   Custom plans with non-zero request limits → 100 (safe fallback)
 *
 * Run: pnpm --filter @workspace/db run migrate:add-max-bulk-emails
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function migrate() {
  // 1. Add column if not already present (safe to re-run)
  await db.execute(sql`
    ALTER TABLE plan_configs
    ADD COLUMN IF NOT EXISTS max_bulk_emails INTEGER NOT NULL DEFAULT 0
  `);
  console.log("✓ max_bulk_emails column ensured on plan_configs");

  // 2. Backfill: keep FREE at 0, set BASIC → 100, PRO → 500
  await db.execute(sql`
    UPDATE plan_configs
    SET max_bulk_emails = CASE
      WHEN plan = 'FREE'  THEN 0
      WHEN plan = 'BASIC' THEN 100
      WHEN plan = 'PRO'   THEN 500
      ELSE 100
    END
    WHERE max_bulk_emails = 0 AND plan != 'FREE'
  `);
  console.log("✓ Backfilled BASIC → 100, PRO → 500, custom plans → 100");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
