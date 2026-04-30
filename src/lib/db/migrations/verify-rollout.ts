/**
 * Verify the DB objects required by the current app rollout.
 *
 * This fails fast when the code expects a table/column that is missing from the
 * live database, which is safer than discovering the mismatch via 500s after a
 * deploy.
 *
 * Run: pnpm --filter @workspace/db run migrate:verify-rollout
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

interface CheckResult {
  ok: boolean;
  label: string;
}

async function checkTable(tableName: string): Promise<CheckResult> {
  const result = await db.execute(
    sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
      ) AS ok
    `,
  );

  return {
    ok: Boolean(result.rows[0]?.ok),
    label: `table public.${tableName}`,
  };
}

async function checkColumn(tableName: string, columnName: string): Promise<CheckResult> {
  const result = await db.execute(
    sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = ${tableName}
          AND column_name = ${columnName}
      ) AS ok
    `,
  );

  return {
    ok: Boolean(result.rows[0]?.ok),
    label: `column public.${tableName}.${columnName}`,
  };
}

async function main() {
  const checks = await Promise.all([
    checkTable("plan_configs"),
    checkColumn("plan_configs", "max_bulk_emails"),
    checkTable("bulk_jobs"),
    checkColumn("bulk_jobs", "user_id"),
    checkColumn("bulk_jobs", "emails"),
    checkColumn("bulk_jobs", "results"),
  ]);

  const failures = checks.filter((check) => !check.ok);

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.label}`);
  }

  if (failures.length > 0) {
    throw new Error(
      `Database rollout verification failed for ${failures.length} item(s): ${failures
        .map((failure) => failure.label)
        .join(", ")}`,
    );
  }

  console.log("Database rollout verification passed.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
