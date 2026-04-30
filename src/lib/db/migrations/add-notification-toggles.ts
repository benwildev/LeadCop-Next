/**
 * Idempotent migration: add per-notification-type toggle columns to the
 * email_settings table.
 *
 * New columns (all boolean NOT NULL DEFAULT true):
 *   notify_admin_on_new_ticket      — admin alert when a support ticket is opened
 *   notify_user_on_ticket_created   — confirmation sent to user on ticket creation
 *   notify_admin_on_new_subscriber  — admin alert when someone subscribes to newsletter
 *
 * Run: pnpm --filter @workspace/db run migrate:add-notification-toggles
 */
import { sql } from "drizzle-orm";
import { db } from "../index.js";

async function migrate() {
  await db.execute(sql`
    ALTER TABLE email_settings
    ADD COLUMN IF NOT EXISTS notify_admin_on_new_ticket BOOLEAN NOT NULL DEFAULT true
  `);
  console.log("✓ notify_admin_on_new_ticket column ensured on email_settings");

  await db.execute(sql`
    ALTER TABLE email_settings
    ADD COLUMN IF NOT EXISTS notify_user_on_ticket_created BOOLEAN NOT NULL DEFAULT true
  `);
  console.log("✓ notify_user_on_ticket_created column ensured on email_settings");

  await db.execute(sql`
    ALTER TABLE email_settings
    ADD COLUMN IF NOT EXISTS notify_admin_on_new_subscriber BOOLEAN NOT NULL DEFAULT true
  `);
  console.log("✓ notify_admin_on_new_subscriber column ensured on email_settings");
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
