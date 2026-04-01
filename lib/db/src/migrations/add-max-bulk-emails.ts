/**
 * Idempotent migration: add max_bulk_emails column to plan_configs table.
 * Defaults to 0 (disabled) for all plans.
 * Set non-zero values via the admin Plan Config UI or directly below.
 *
 * Run: pnpm --filter @workspace/db run migrate:add-max-bulk-emails
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function migrate() {
  await db.execute(sql`
    ALTER TABLE plan_configs
    ADD COLUMN IF NOT EXISTS max_bulk_emails INTEGER NOT NULL DEFAULT 0
  `);
  console.log("✓ max_bulk_emails column ensured on plan_configs");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
