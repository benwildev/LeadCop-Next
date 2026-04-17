import { Router } from "express";
import { db, newsletterSubscribersTable, newsletterCampaignsTable, emailSettingsTable } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/session.js";
import { logger } from "../lib/logger.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { sendNewsletterNewSubscriberNotification } from "../lib/email.js";

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

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
    auth: { user: settings.smtpUser, pass: settings.smtpPass },
  });
}

// ── Public: subscribe ─────────────────────────────────────────────────────────

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
});

router.post("/newsletter/subscribe", async (req: any, res: any) => {
  const result = subscribeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const { email, name } = result.data;

  const [existing] = await db
    .select({ id: newsletterSubscribersTable.id, status: newsletterSubscribersTable.status })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    if (existing.status === "ACTIVE") {
      res.json({ message: "You're already subscribed!" });
      return;
    }
    await db
      .update(newsletterSubscribersTable)
      .set({ status: "ACTIVE", unsubscribedAt: null, subscribedAt: new Date() })
      .where(eq(newsletterSubscribersTable.id, existing.id));
    res.json({ message: "Welcome back! You've been resubscribed." });
    sendNewsletterNewSubscriberNotification({ subscriberEmail: email.toLowerCase(), subscriberName: name }).catch(() => {});
    return;
  }

  const token = generateToken();
  await db.insert(newsletterSubscribersTable).values({
    email: email.toLowerCase(),
    name: name || null,
    token,
  });

  res.json({ message: "Thanks for subscribing!" });
  sendNewsletterNewSubscriberNotification({ subscriberEmail: email.toLowerCase(), subscriberName: name }).catch(() => {});
});

// ── Public: unsubscribe ───────────────────────────────────────────────────────

router.get("/newsletter/unsubscribe", async (req: any, res: any) => {
  const token = String(req.query.token || "");
  if (!token) {
    res.status(400).json({ error: "Invalid unsubscribe link" });
    return;
  }

  const [sub] = await db
    .select({ id: newsletterSubscribersTable.id })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.token, token))
    .limit(1);

  if (!sub) {
    res.status(404).json({ error: "Subscription not found" });
    return;
  }

  await db
    .update(newsletterSubscribersTable)
    .set({ status: "UNSUBSCRIBED", unsubscribedAt: new Date() })
    .where(eq(newsletterSubscribersTable.id, sub.id));

  res.status(200).setHeader("Content-Type", "text/html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Unsubscribed — LeadCop</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e5e5e5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 16px; padding: 48px 40px; max-width: 440px; text-align: center; }
    h1 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 12px; }
    p { font-size: 15px; color: #9ca3af; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #8b5cf6; color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px; }
    a:hover { background: #7c3aed; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✓</div>
    <h1>Unsubscribed successfully</h1>
    <p>You've been removed from the LeadCop newsletter. You won't receive any further emails from us.</p>
    <a href="/">Back to LeadCop</a>
  </div>
</body>
</html>`);
});

// ── Admin: subscribers ────────────────────────────────────────────────────────

router.get("/admin/newsletter/subscribers", requireAdmin, async (req: any, res: any) => {
  const subscribers = await db
    .select()
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.subscribedAt));

  const [activeCount] = await db
    .select({ count: count() })
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.status, "ACTIVE"));

  res.json({
    subscribers: subscribers.map(s => ({
      ...s,
      subscribedAt: s.subscribedAt.toISOString(),
      unsubscribedAt: s.unsubscribedAt?.toISOString() ?? null,
    })),
    total: subscribers.length,
    activeCount: Number(activeCount?.count ?? 0),
  });
});

router.delete("/admin/newsletter/subscribers/:id", requireAdmin, async (req: any, res: any) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const deleted = await db
    .delete(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.id, id))
    .returning();

  if (deleted.length === 0) {
    res.status(404).json({ error: "Subscriber not found" });
    return;
  }

  res.json({ message: "Subscriber removed" });
});

// ── Admin: campaigns ──────────────────────────────────────────────────────────

const createCampaignSchema = z.object({
  subject: z.string().min(1).max(255),
  previewText: z.string().max(255).optional().nullable(),
  htmlContent: z.string().min(1),
});

router.get("/admin/newsletter/campaigns", requireAdmin, async (req: any, res: any) => {
  const campaigns = await db
    .select()
    .from(newsletterCampaignsTable)
    .orderBy(desc(newsletterCampaignsTable.createdAt));

  res.json({ campaigns: campaigns.map(c => ({
    ...c,
    sentAt: c.sentAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })) });
});

router.post("/admin/newsletter/campaigns", requireAdmin, async (req: any, res: any) => {
  const result = createCampaignSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues });
    return;
  }

  const [campaign] = await db
    .insert(newsletterCampaignsTable)
    .values({ ...result.data, updatedAt: new Date() })
    .returning();

  res.status(201).json({
    ...campaign,
    sentAt: null,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  });
});

router.patch("/admin/newsletter/campaigns/:id", requireAdmin, async (req: any, res: any) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const result = createCampaignSchema.partial().safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [existing] = await db
    .select({ status: newsletterCampaignsTable.status })
    .from(newsletterCampaignsTable)
    .where(eq(newsletterCampaignsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  if (existing.status === "SENT") {
    res.status(400).json({ error: "Cannot edit a sent campaign" });
    return;
  }

  const [updated] = await db
    .update(newsletterCampaignsTable)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(newsletterCampaignsTable.id, id))
    .returning();

  res.json({
    ...updated,
    sentAt: updated.sentAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.delete("/admin/newsletter/campaigns/:id", requireAdmin, async (req: any, res: any) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const [existing] = await db
    .select({ status: newsletterCampaignsTable.status })
    .from(newsletterCampaignsTable)
    .where(eq(newsletterCampaignsTable.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  if (existing.status === "SENT") {
    res.status(400).json({ error: "Cannot delete a sent campaign" });
    return;
  }

  await db.delete(newsletterCampaignsTable).where(eq(newsletterCampaignsTable.id, id));
  res.json({ message: "Campaign deleted" });
});

// ── Admin: send campaign ──────────────────────────────────────────────────────

router.post("/admin/newsletter/campaigns/:id/send", requireAdmin, async (req: any, res: any) => {
  const id = parseInt(String(req.params.id || "0"));
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const [campaign] = await db
    .select()
    .from(newsletterCampaignsTable)
    .where(eq(newsletterCampaignsTable.id, id))
    .limit(1);

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  if (campaign.status === "SENT") {
    res.status(400).json({ error: "Campaign has already been sent" });
    return;
  }

  const settings = await getEmailSettings();
  if (!settings?.enabled || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) {
    res.status(400).json({ error: "SMTP is not configured. Configure email settings first." });
    return;
  }

  const activeSubscribers = await db
    .select()
    .from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.status, "ACTIVE"));

  if (activeSubscribers.length === 0) {
    res.status(400).json({ error: "No active subscribers to send to" });
    return;
  }

  // Mark as sending
  await db
    .update(newsletterCampaignsTable)
    .set({ status: "SENDING", updatedAt: new Date() })
    .where(eq(newsletterCampaignsTable.id, id));

  res.json({ message: `Sending to ${activeSubscribers.length} subscribers…`, recipientCount: activeSubscribers.length });

  // Fire-and-forget sending
  (async () => {
    const transport = createTransport({
      smtpHost: settings.smtpHost!,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser!,
      smtpPass: settings.smtpPass!,
      smtpSecure: settings.smtpSecure,
    });

    let sent = 0;
    for (const sub of activeSubscribers) {
      const unsubUrl = `${process.env.SITE_URL || "https://leadcop.io"}/api/newsletter/unsubscribe?token=${sub.token}`;
      const html = `${campaign.htmlContent}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af">
  <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a>
</div>`;

      try {
        await transport.sendMail({
          from: `"${settings.fromName}" <${settings.fromEmail}>`,
          to: sub.email,
          subject: campaign.subject,
          ...(campaign.previewText ? { text: campaign.previewText } : {}),
          html,
        });
        sent++;
      } catch (err) {
        logger.error({ err, email: sub.email }, "Failed to send newsletter to subscriber");
      }
    }

    await db
      .update(newsletterCampaignsTable)
      .set({ status: "SENT", sentAt: new Date(), recipientCount: sent, updatedAt: new Date() })
      .where(eq(newsletterCampaignsTable.id, id));

    logger.info({ campaignId: id, sent, total: activeSubscribers.length }, "Newsletter campaign sent");
  })().catch(err => logger.error({ err, campaignId: id }, "Campaign send failed"));
});

export default router;
