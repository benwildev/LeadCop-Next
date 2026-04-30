import { NextRequest, NextResponse } from "next/server";
import { db, emailSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";
import { sendTestEmail } from "@/lib/backend/email";

function maskPass(pass: string | null | undefined): string | null {
  if (!pass) return null;
  return `${pass.slice(0, 4)}••••••••`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const [settings] = await db
      .select()
      .from(emailSettingsTable)
      .where(eq(emailSettingsTable.id, 1))
      .limit(1);

    const defaults = {
      enabled: false,
      smtpHost: null,
      smtpPort: 587,
      smtpUser: null,
      smtpPass: null,
      smtpSecure: false,
      fromName: "LeadCop",
      fromEmail: null,
      notifyOnSubmit: true,
      notifyOnDecision: true,
      notifyAdminOnNewTicket: true,
      notifyUserOnTicketCreated: true,
      notifyAdminOnNewSubscriber: true,
      notifyUserOnTicketStatusChange: true,
      adminEmail: null,
    };

    if (!settings) {
      return NextResponse.json({ ...defaults, connectionStatus: "unconfigured" });
    }

    const isConfigured = !!(settings.smtpHost && settings.smtpUser && settings.smtpPass && settings.fromEmail);

    return NextResponse.json({
      enabled: settings.enabled,
      smtpHost: settings.smtpHost || null,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser || null,
      smtpPass: maskPass(settings.smtpPass),
      smtpSecure: settings.smtpSecure,
      fromName: settings.fromName,
      fromEmail: settings.fromEmail || null,
      notifyOnSubmit: settings.notifyOnSubmit,
      notifyOnDecision: settings.notifyOnDecision,
      notifyAdminOnNewTicket: settings.notifyAdminOnNewTicket,
      notifyUserOnTicketCreated: settings.notifyUserOnTicketCreated,
      notifyAdminOnNewSubscriber: settings.notifyAdminOnNewSubscriber,
      notifyUserOnTicketStatusChange: settings.notifyUserOnTicketStatusChange,
      adminEmail: settings.adminEmail || null,
      updatedAt: settings.updatedAt.toISOString(),
      connectionStatus: settings.enabled && isConfigured
        ? "ready"
        : isConfigured
          ? "configured"
          : "unconfigured",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  smtpHost: z.string().min(1).optional().nullable(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().min(1).optional().nullable(),
  smtpPass: z.string().optional().nullable(),
  smtpSecure: z.boolean().optional(),
  fromName: z.string().min(1).optional(),
  fromEmail: z.string().email().optional().nullable(),
  notifyOnSubmit: z.boolean().optional(),
  notifyOnDecision: z.boolean().optional(),
  notifyAdminOnNewTicket: z.boolean().optional(),
  notifyUserOnTicketCreated: z.boolean().optional(),
  notifyAdminOnNewSubscriber: z.boolean().optional(),
  notifyUserOnTicketStatusChange: z.boolean().optional(),
  adminEmail: z.string().email().optional().nullable(),
});

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const data = result.data;
    const [existing] = await db
      .select({ id: emailSettingsTable.id })
      .from(emailSettingsTable)
      .where(eq(emailSettingsTable.id, 1))
      .limit(1);

    const updates: Record<string, any> = { updatedAt: new Date() };

    if (data.enabled !== undefined) updates.enabled = data.enabled;
    if (data.smtpHost !== undefined) updates.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) updates.smtpPort = data.smtpPort;
    if (data.smtpUser !== undefined) updates.smtpUser = data.smtpUser;
    if (data.smtpSecure !== undefined) updates.smtpSecure = data.smtpSecure;
    if (data.fromName !== undefined) updates.fromName = data.fromName;
    if (data.fromEmail !== undefined) updates.fromEmail = data.fromEmail;
    if (data.notifyOnSubmit !== undefined) updates.notifyOnSubmit = data.notifyOnSubmit;
    if (data.notifyOnDecision !== undefined) updates.notifyOnDecision = data.notifyOnDecision;
    if (data.notifyAdminOnNewTicket !== undefined) updates.notifyAdminOnNewTicket = data.notifyAdminOnNewTicket;
    if (data.notifyUserOnTicketCreated !== undefined) updates.notifyUserOnTicketCreated = data.notifyUserOnTicketCreated;
    if (data.notifyAdminOnNewSubscriber !== undefined) updates.notifyAdminOnNewSubscriber = data.notifyAdminOnNewSubscriber;
    if (data.notifyUserOnTicketStatusChange !== undefined) updates.notifyUserOnTicketStatusChange = data.notifyUserOnTicketStatusChange;
    if (data.adminEmail !== undefined) updates.adminEmail = data.adminEmail;

    if (data.smtpPass !== undefined && data.smtpPass !== null && !data.smtpPass.includes("••••••••")) {
      updates.smtpPass = data.smtpPass;
    } else if (data.smtpPass === null) {
      updates.smtpPass = null;
    }

    if (!existing) {
      await db.insert(emailSettingsTable).values({
        id: 1,
        enabled: (updates.enabled as boolean) ?? false,
        smtpHost: (updates.smtpHost as string | null) ?? null,
        smtpPort: (updates.smtpPort as number) ?? 587,
        smtpUser: (updates.smtpUser as string | null) ?? null,
        smtpPass: (updates.smtpPass as string | null) ?? null,
        smtpSecure: (updates.smtpSecure as boolean) ?? false,
        fromName: (updates.fromName as string) ?? "LeadCop",
        fromEmail: (updates.fromEmail as string | null) ?? null,
        notifyOnSubmit: (updates.notifyOnSubmit as boolean) ?? true,
        notifyOnDecision: (updates.notifyOnDecision as boolean) ?? true,
        notifyAdminOnNewTicket: (updates.notifyAdminOnNewTicket as boolean) ?? true,
        notifyUserOnTicketCreated: (updates.notifyUserOnTicketCreated as boolean) ?? true,
        notifyAdminOnNewSubscriber: (updates.notifyAdminOnNewSubscriber as boolean) ?? true,
        notifyUserOnTicketStatusChange: (updates.notifyUserOnTicketStatusChange as boolean) ?? true,
        adminEmail: (updates.adminEmail as string | null) ?? null,
      });
    } else {
      await db.update(emailSettingsTable).set(updates).where(eq(emailSettingsTable.id, existing.id));
    }

    return NextResponse.json({ message: "Email settings updated" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const { to } = await req.json();
    if (!to || !/\S+@\S+\.\S+/.test(to)) {
      return NextResponse.json({ error: "Valid 'to' email required" }, { status: 400 });
    }

    await sendTestEmail(to);
    return NextResponse.json({ message: `Test email sent to ${to}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send test email" }, { status: 500 });
  }
}
