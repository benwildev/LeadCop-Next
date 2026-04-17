import { Router } from "express";
import { db, emailSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/session.js";
import { sendTestEmail } from "../lib/email.js";

const router = Router();

function maskPass(pass: string | null | undefined): string | null {
  if (!pass) return null;
  return `${pass.slice(0, 4)}••••••••`;
}

router.get("/", requireAdmin, async (_req, res) => {
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
    adminEmail: null,
  };

  if (!settings) {
    res.json({ ...defaults, connectionStatus: "unconfigured" });
    return;
  }

  const isConfigured = !!(settings.smtpHost && settings.smtpUser && settings.smtpPass && settings.fromEmail);

  res.json({
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
    adminEmail: settings.adminEmail || null,
    updatedAt: settings.updatedAt.toISOString(),
    connectionStatus: settings.enabled && isConfigured
      ? "ready"
      : isConfigured
        ? "configured"
        : "unconfigured",
  });
});

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
  adminEmail: z.string().email().optional().nullable(),
});

router.put("/", requireAdmin, async (req, res) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid input", details: result.error.issues });
    return;
  }

  const data = result.data;
  const [existing] = await db
    .select({ id: emailSettingsTable.id, smtpPass: emailSettingsTable.smtpPass })
    .from(emailSettingsTable)
    .where(eq(emailSettingsTable.id, 1))
    .limit(1);

  const updates: Record<string, unknown> = { updatedAt: new Date() };

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
  if (data.adminEmail !== undefined) updates.adminEmail = data.adminEmail;

  // Don't overwrite the real password if the masked placeholder is sent back
  if (data.smtpPass !== undefined && data.smtpPass !== null && !data.smtpPass.includes("••••••••")) {
    updates.smtpPass = data.smtpPass;
  } else if (data.smtpPass === null) {
    updates.smtpPass = null;
  }

  if (!existing) {
    await db.insert(emailSettingsTable).values({
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
      adminEmail: (updates.adminEmail as string | null) ?? null,
    });
  } else {
    await db.update(emailSettingsTable).set(updates).where(eq(emailSettingsTable.id, existing.id));
  }

  res.json({ message: "Email settings updated" });
});

router.post("/test", requireAdmin, async (req, res) => {
  const { to } = req.body as { to?: string };
  if (!to || !/\S+@\S+\.\S+/.test(to)) {
    res.status(400).json({ error: "Valid 'to' email required" });
    return;
  }

  try {
    await sendTestEmail(to);
    res.json({ message: `Test email sent to ${to}` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to send test email";
    res.status(500).json({ error: msg });
  }
});

export default router;
