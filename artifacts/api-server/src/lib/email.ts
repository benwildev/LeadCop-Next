import nodemailer from "nodemailer";
import { db, emailSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

async function getEmailSettings() {
  const [settings] = await db
    .select()
    .from(emailSettingsTable)
    .where(eq(emailSettingsTable.id, 1))
    .limit(1);
  return settings || null;
}

function createTransport(settings: {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpSecure: boolean;
}) {
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass,
    },
  });
}

export async function sendUpgradeRequestNotification(opts: {
  userEmail: string;
  userName: string;
  plan: string;
  note?: string | null;
}) {
  const settings = await getEmailSettings();
  if (!settings?.enabled || !settings.notifyOnSubmit) return;
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  const targets: Promise<void>[] = [];

  // Notify the admin
  if (settings.adminEmail) {
    targets.push(
      transport.sendMail({
        from: `"${settings.fromName}" <${settings.fromEmail}>`,
        to: settings.adminEmail,
        subject: `New Upgrade Request — ${opts.plan} from ${opts.userName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#8b5cf6">New Upgrade Request</h2>
            <p>A user has submitted an upgrade request.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;font-weight:bold;color:#555">User</td><td style="padding:8px">${opts.userName} (${opts.userEmail})</td></tr>
              <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Plan</td><td style="padding:8px">${opts.plan}</td></tr>
              ${opts.note ? `<tr><td style="padding:8px;font-weight:bold;color:#555">Note</td><td style="padding:8px">${opts.note}</td></tr>` : ""}
            </table>
            <p style="color:#888;font-size:13px">Log in to the admin dashboard to approve or reject this request.</p>
          </div>
        `,
      }).then(() => {}).catch((err) => logger.error({ err }, "Failed to send admin upgrade request email"))
    );
  }

  // Confirm to the user
  targets.push(
    transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: opts.userEmail,
      subject: `Your ${opts.plan} upgrade request has been received`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#8b5cf6">Upgrade Request Received</h2>
          <p>Hi ${opts.userName},</p>
          <p>We've received your request to upgrade to the <strong>${opts.plan}</strong> plan. Our team will review it and get back to you shortly.</p>
          ${opts.note ? `<p><em>Your note: "${opts.note}"</em></p>` : ""}
          <p style="color:#888;font-size:13px">If you have any questions, reply to this email.</p>
        </div>
      `,
    }).then(() => {}).catch((err) => logger.error({ err }, "Failed to send user upgrade confirmation email"))
  );

  await Promise.allSettled(targets);
}

export async function sendUpgradeDecisionNotification(opts: {
  userEmail: string;
  userName: string;
  plan: string;
  status: "APPROVED" | "REJECTED";
}) {
  const settings = await getEmailSettings();
  if (!settings?.enabled || !settings.notifyOnDecision) return;
  if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  const isApproved = opts.status === "APPROVED";

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.userEmail,
    subject: isApproved
      ? `Your ${opts.plan} upgrade has been approved!`
      : `Update on your ${opts.plan} upgrade request`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:${isApproved ? "#22c55e" : "#ef4444"}">${isApproved ? "Upgrade Approved!" : "Upgrade Request Update"}</h2>
        <p>Hi ${opts.userName},</p>
        ${isApproved
          ? `<p>Great news! Your request to upgrade to the <strong>${opts.plan}</strong> plan has been <strong style="color:#22c55e">approved</strong>. Your account has been updated — log in to see your new limits.</p>`
          : `<p>Unfortunately, your request to upgrade to the <strong>${opts.plan}</strong> plan has been <strong style="color:#ef4444">declined</strong> at this time. If you have questions, please reply to this email.</p>`
        }
        <p style="color:#888;font-size:13px">Thank you for using TempShield.</p>
      </div>
    `,
  }).catch((err) => logger.error({ err }, "Failed to send upgrade decision email"));
}

export async function sendTestEmail(to: string) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) {
    throw new Error("SMTP is not fully configured");
  }

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.verify();
  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to,
    subject: "TempShield — Email test",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Email Test Successful</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <p style="color:#888;font-size:13px">Sent from TempShield admin panel.</p>
      </div>
    `,
  });
}
