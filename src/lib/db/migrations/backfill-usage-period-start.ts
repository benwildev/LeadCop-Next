/**
 * One-time backfill: set usage_period_start = created_at for existing users
 * who received the column default (NOW() at migration time) instead of their
 * actual account creation date.
 *
 * Idempotent: the monthly-reset logic always writes an exact midnight timestamp
 * (DATE_TRUNC('month', now)) whose time portion is 00:00:00.000. The column
 * default writes the full NOW() including a non-zero time portion. Comparing
 * usage_period_start != DATE_TRUNC('month', usage_period_start) catches
 * defaulted rows regardless of which day of the month the script runs.
 *
 * Run: pnpm --filter @workspace/db run migrate:backfill-usage-period
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function backfill() {
  const result = await db.execute(sql`
    UPDATE users
    SET usage_period_start = created_at
    WHERE usage_period_start > created_at
      AND usage_period_start != DATE_TRUNC('month', usage_period_start)
  `);
  const count = (result as { rowCount?: number }).rowCount ?? 0;
  console.log(`Backfilled usage_period_start for ${count} user(s).`);
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
