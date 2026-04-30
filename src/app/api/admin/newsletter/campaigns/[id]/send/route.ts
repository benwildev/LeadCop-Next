import { NextRequest, NextResponse } from "next/server";
import { db, newsletterSubscribersTable, newsletterCampaignsTable, emailSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";
import nodemailer from "nodemailer";

async function getEmailSettings() {
  const [settings] = await db
    .select()
    .from(emailSettingsTable)
    .where(eq(emailSettingsTable.id, 1))
    .limit(1);
  return settings || null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  const { id: campaignIdStr } = await params;
  const campaignId = parseInt(campaignIdStr, 10);
  if (isNaN(campaignId)) return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });

  try {
    const [campaign] = await db
      .select()
      .from(newsletterCampaignsTable)
      .where(eq(newsletterCampaignsTable.id, campaignId))
      .limit(1);

    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status === "SENT") return NextResponse.json({ error: "Campaign already sent" }, { status: 400 });

    const settings = await getEmailSettings();
    if (!settings?.enabled || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass || !settings.fromEmail) {
      return NextResponse.json({ error: "SMTP is not configured" }, { status: 400 });
    }

    const activeSubscribers = await db
      .select()
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.status, "ACTIVE"));

    if (activeSubscribers.length === 0) return NextResponse.json({ error: "No active subscribers" }, { status: 400 });

    // Mark as sending
    await db
      .update(newsletterCampaignsTable)
      .set({ status: "SENDING", updatedAt: new Date() })
      .where(eq(newsletterCampaignsTable.id, campaignId));

    // Response early as the sending might take time
    // In a real production app, this should be a background job (e.g. BullMQ)
    // But since the current architecture uses in-memory/direct calls, we'll fire and forget.
    
    (async () => {
      const transport = nodemailer.createTransport({
        host: settings.smtpHost!,
        port: settings.smtpPort,
        secure: settings.smtpSecure,
        auth: { user: settings.smtpUser!, pass: settings.smtpPass! },
      });

      let sent = 0;
      for (const sub of activeSubscribers) {
        const unsubUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://leadcop.io"}/api/newsletter/unsubscribe?token=${sub.token}`;
        const html = `${campaign.htmlContent}
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#9ca3af">
  <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a>
</div>`;

        try {
          await transport.sendMail({
            from: `"${settings.fromName}" <${settings.fromEmail}>`,
            to: sub.email,
            subject: campaign.subject ?? "Newsletter",
            ...(campaign.previewText ? { text: campaign.previewText } : {}),
            html,
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send newsletter to ${sub.email}:`, err);
        }
      }

      await db
        .update(newsletterCampaignsTable)
        .set({ status: "SENT", sentAt: new Date(), recipientCount: sent, updatedAt: new Date() })
        .where(eq(newsletterCampaignsTable.id, campaignId));
    })().catch(err => console.error("Campaign send failed:", err));

    return NextResponse.json({ 
      message: `Sending to ${activeSubscribers.length} subscribers…`, 
      recipientCount: activeSubscribers.length 
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
