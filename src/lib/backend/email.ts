import nodemailer from "nodemailer";
import { db, emailSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

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
        <p style="color:#888;font-size:13px">Thank you for using LeadCop.</p>
      </div>
    `,
  }).catch((err) => logger.error({ err }, "Failed to send upgrade decision email"));
}

export async function sendPasswordResetEmail(opts: {
  userEmail: string;
  userName: string;
  resetUrl: string;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) {
    throw new Error("SMTP is not configured");
  }

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.userEmail,
    subject: "Reset your password",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Reset your password</h2>
        <p>Hi ${opts.userName},</p>
        <p>We received a request to reset the password for your account. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <p style="margin:24px 0">
          <a href="${opts.resetUrl}" style="background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Reset password
          </a>
        </p>
        <p>Or copy this link into your browser:</p>
        <p style="word-break:break-all;color:#8b5cf6;font-size:13px">${opts.resetUrl}</p>
        <p style="color:#888;font-size:13px;margin-top:24px">If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
      </div>
    `,
  }).catch((err) => {
    logger.error({ err }, "Failed to send password reset email");
    throw err;
  });
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
    subject: "LeadCop — Email test",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Email Test Successful</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <p style="color:#888;font-size:13px">Sent from LeadCop admin panel.</p>
      </div>
    `,
  });
}
export async function sendSupportTicketAdminNotification(opts: {
  id: number;
  subject: string;
  category: string;
  userEmail: string;
  userName: string;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail || !settings.adminEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: settings.adminEmail,
    subject: `[LeadCop Support] New Case #${opts.id}: ${opts.subject} (${opts.category})`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">New Support Ticket</h2>
        <p>A new support ticket has been opened.</p>
        <p><strong>From:</strong> ${opts.userName} (${opts.userEmail})</p>
        <p><strong>Category:</strong> ${opts.category}</p>
        <p><strong>Subject:</strong> ${opts.subject}</p>
        <p style="margin-top:24px">
          <a href="${process.env.APP_URL}/admin/support" style="background:#8b5cf6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            View in Admin Dashboard
          </a>
        </p>
      </div>
    `,
  }).catch(err => logger.error({ err }, "Failed to send support ticket admin email"));
}

export async function sendSupportTicketUserConfirmation(opts: {
  id: number;
  subject: string;
  userEmail: string;
  userName: string;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.userEmail,
    subject: `Re: [LeadCop Support] New Case #${opts.id}: ${opts.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Support Request Received</h2>
        <p>Hi ${opts.userName},</p>
        <p>We've received your support request regarding "<strong>${opts.subject}</strong>". Our team is reviewing it and will get back to you shortly.</p>
        <p><strong>Ticket ID:</strong> #${opts.id}</p>
        <p style="color:#888;font-size:13px;margin-top:24px">Thank you for your patience.</p>
      </div>
    `,
  }).catch(err => logger.error({ err }, "Failed to send support ticket user confirmation email"));
}

export async function sendNewsletterNewSubscriberNotification(opts: {
  email: string;
  name?: string | null;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail || !settings.adminEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: settings.adminEmail,
    subject: `New Newsletter Subscriber: ${opts.email}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">New Newsletter Subscriber</h2>
        <p>A new user has subscribed to the newsletter.</p>
        <p><strong>Email:</strong> ${opts.email}</p>
        ${opts.name ? `<p><strong>Name:</strong> ${opts.name}</p>` : ""}
      </div>
    `,
  }).catch(err => logger.error({ err }, "Failed to send newsletter subscriber email"));
}

export async function sendSupportTicketAdminReplyNotification(opts: {
  ticketId: number;
  subject: string;
  replyMessage: string;
  userEmail: string;
  userName: string;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.userEmail,
    subject: `Re: [LeadCop Support] Case #${opts.ticketId}: ${opts.subject}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Our Team Replied</h2>
        <p>Hi ${opts.userName},</p>
        <p>We've replied to your support ticket:</p>
        <div style="background:#f9f9f9;padding:16px;border-radius:8px;border-left:4px solid #8b5cf6;margin:16px 0">
          ${opts.replyMessage.replace(/\n/g, "<br>")}
        </div>
        <p style="color:#888;font-size:13px">You can reply to this email or visit the dashboard to see the full conversion.</p>
      </div>
    `,
  }).catch(err => logger.error({ err }, "Failed to send support ticket reply email"));
}

export async function sendSupportTicketStatusChangeNotification(opts: {
  ticketId: number;
  subject: string;
  newStatus: string;
  userEmail: string;
  userName: string;
}) {
  const settings = await getEmailSettings();
  if (!settings?.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) return;

  const transport = createTransport({
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpPass: settings.smtpPass,
    smtpSecure: settings.smtpSecure,
  });

  const statusMap: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };

  await transport.sendMail({
    from: `"${settings.fromName}" <${settings.fromEmail}>`,
    to: opts.userEmail,
    subject: `[LeadCop Support] Status Updated: Case #${opts.ticketId}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#8b5cf6">Ticket Status Updated</h2>
        <p>Hi ${opts.userName},</p>
        <p>The status of your ticket "<strong>${opts.subject}</strong>" (Case #${opts.ticketId}) has been updated to: <strong style="color:#8b5cf6">${statusMap[opts.newStatus] || opts.newStatus}</strong>.</p>
        <p style="color:#888;font-size:13px;margin-top:24px">If you have further questions, please let us know.</p>
      </div>
    `,
  }).catch(err => logger.error({ err }, "Failed to send status change email"));
}


