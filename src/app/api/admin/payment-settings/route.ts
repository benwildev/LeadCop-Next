import { NextRequest, NextResponse } from "next/server";
import { db, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

function computeGatewayStatuses(settings: {
  stripeEnabled: boolean;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  paypalEnabled: boolean;
  paypalClientId: string | null;
  paypalSecret: string | null;
}) {
  const stripeHasKeys = !!(settings.stripePublishableKey && settings.stripeSecretKey);
  const stripeHasWebhook = !!settings.stripeWebhookSecret;
  const paypalHasKeys = !!(settings.paypalClientId && settings.paypalSecret);

  return {
    manual: { enabled: true, status: "ready" as const, message: "Always available" },
    stripe: {
      enabled: settings.stripeEnabled,
      status: (settings.stripeEnabled && stripeHasKeys && stripeHasWebhook
        ? "ready"
        : settings.stripeEnabled && stripeHasKeys
          ? "partial"
          : "unconfigured") as "ready" | "partial" | "unconfigured",
      message: !stripeHasKeys
        ? "Missing publishable and secret keys"
        : !stripeHasWebhook
          ? "Missing webhook secret (plan auto-upgrade will not work)"
          : "Fully configured",
    },
    paypal: {
      enabled: settings.paypalEnabled,
      status: (settings.paypalEnabled && paypalHasKeys ? "ready" : "unconfigured") as "ready" | "unconfigured",
      message: !paypalHasKeys ? "Missing client ID or secret" : "Fully configured",
    },
  };
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    const defaults = {
      gateway: "MANUAL",
      stripeEnabled: false,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      paypalEnabled: false,
      paypalClientId: null,
      paypalSecret: null,
      paypalMode: "sandbox",
      planPrices: { BASIC: 9, PRO: 29 },
    };

    if (!settings) {
      return NextResponse.json({ 
        ...defaults, 
        connectionStatus: computeGatewayStatuses(defaults as any) 
      });
    }

    return NextResponse.json({
      gateway: settings.gateway,
      stripeEnabled: settings.stripeEnabled,
      stripePublishableKey: settings.stripePublishableKey || null,
      stripeSecretKey: settings.stripeSecretKey ? `${settings.stripeSecretKey.slice(0, 8)}••••••••` : null,
      stripeWebhookSecret: settings.stripeWebhookSecret ? `${settings.stripeWebhookSecret.slice(0, 8)}••••••••` : null,
      paypalEnabled: settings.paypalEnabled,
      paypalClientId: settings.paypalClientId || null,
      paypalSecret: settings.paypalSecret ? `${settings.paypalSecret.slice(0, 8)}••••••••` : null,
      paypalMode: settings.paypalMode,
      planPrices: settings.planPrices || { BASIC: 9, PRO: 29 },
      freeVerifyLimit: settings.freeVerifyLimit ?? 5,
      updatedAt: settings.updatedAt.toISOString(),
      connectionStatus: computeGatewayStatuses(settings),
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updatePaymentSettingsSchema = z.object({
  gateway: z.enum(["MANUAL", "STRIPE", "PAYPAL"]).optional(),
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().optional().nullable(),
  paypalSecret: z.string().optional().nullable(),
  paypalMode: z.enum(["sandbox", "live"]).optional(),
  planPrices: z.record(z.string(), z.number().positive()).optional(),
  freeVerifyLimit: z.number().int().min(0).max(1000).optional(),
});

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const body = await req.json();
    const result = updatePaymentSettingsSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const data = result.data;

    const [existing] = await db
      .select({ id: paymentSettingsTable.id })
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (data.gateway !== undefined) updates.gateway = data.gateway;
    if (data.stripeEnabled !== undefined) updates.stripeEnabled = data.stripeEnabled;
    if (data.stripePublishableKey !== undefined) updates.stripePublishableKey = data.stripePublishableKey;
    if (data.paypalEnabled !== undefined) updates.paypalEnabled = data.paypalEnabled;
    if (data.paypalClientId !== undefined) updates.paypalClientId = data.paypalClientId;
    if (data.paypalMode !== undefined) updates.paypalMode = data.paypalMode;
    if (data.planPrices !== undefined) updates.planPrices = data.planPrices;
    if (data.freeVerifyLimit !== undefined) updates.freeVerifyLimit = data.freeVerifyLimit;

    if (data.stripeSecretKey !== undefined && data.stripeSecretKey !== null && !data.stripeSecretKey.includes("••••••••")) {
      updates.stripeSecretKey = data.stripeSecretKey;
    } else if (data.stripeSecretKey === null) {
      updates.stripeSecretKey = null;
    }

    if (data.stripeWebhookSecret !== undefined && data.stripeWebhookSecret !== null && !data.stripeWebhookSecret.includes("••••••••")) {
      updates.stripeWebhookSecret = data.stripeWebhookSecret;
    } else if (data.stripeWebhookSecret === null) {
      updates.stripeWebhookSecret = null;
    }

    if (data.paypalSecret !== undefined && data.paypalSecret !== null && !data.paypalSecret.includes("••••••••")) {
      updates.paypalSecret = data.paypalSecret;
    } else if (data.paypalSecret === null) {
      updates.paypalSecret = null;
    }

    if (!existing) {
      await db.insert(paymentSettingsTable).values({
        id: 1,
        gateway: (updates.gateway as string) || "MANUAL",
        stripeEnabled: (updates.stripeEnabled as boolean) ?? false,
        stripePublishableKey: (updates.stripePublishableKey as string | null) ?? null,
        stripeSecretKey: (updates.stripeSecretKey as string | null) ?? null,
        stripeWebhookSecret: (updates.stripeWebhookSecret as string | null) ?? null,
        paypalEnabled: (updates.paypalEnabled as boolean) ?? false,
        paypalClientId: (updates.paypalClientId as string | null) ?? null,
        paypalSecret: (updates.paypalSecret as string | null) ?? null,
        paypalMode: (updates.paypalMode as string) || "sandbox",
        planPrices: (updates.planPrices as Record<string, number>) || { BASIC: 9, PRO: 29 },
      });
    } else {
      await db.update(paymentSettingsTable).set(updates).where(eq(paymentSettingsTable.id, existing.id));
    }

    return NextResponse.json({ message: "Payment settings updated" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
