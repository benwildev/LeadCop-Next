import { NextRequest, NextResponse } from "next/server";
import { db, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "@/lib/backend/session";

function computeGatewayStatuses(settings: any) {
  const stripeHasKeys = !!(settings.stripePublishableKey && settings.stripeSecretKey);
  const paypalHasKeys = !!(settings.paypalClientId && settings.paypalSecret);

  return {
    stripe: {
      status: (settings.stripeEnabled && stripeHasKeys ? "ready" : settings.stripeEnabled ? "error" : "unconfigured") as "ready" | "error" | "unconfigured",
    },
    paypal: {
      status: (settings.paypalEnabled && paypalHasKeys ? "ready" : settings.paypalEnabled ? "error" : "unconfigured") as "ready" | "error" | "unconfigured",
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
      activeGateway: "stripe",
      currency: "USD",
      stripeEnabled: false,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      paypalEnabled: false,
      paypalClientId: null,
      paypalSecret: null,
      paypalMode: "sandbox",
      freeVerifyLimit: 5,
    };

    if (!settings) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json({
      activeGateway: settings.gateway || "stripe",
      currency: settings.currency || "USD",
      stripeEnabled: settings.stripeEnabled,
      stripePublishableKey: settings.stripePublishableKey || null,
      stripeSecretKey: settings.stripeSecretKey || null,
      stripeWebhookSecret: settings.stripeWebhookSecret || null,
      paypalEnabled: settings.paypalEnabled,
      paypalClientId: settings.paypalClientId || null,
      paypalSecret: settings.paypalSecret || null,
      paypalMode: settings.paypalMode || "sandbox",
      freeVerifyLimit: settings.freeVerifyLimit ?? 5,
      updatedAt: settings.updatedAt ? settings.updatedAt.toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    console.error("[PaymentSettings GET Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const updateSchema = z.object({
  activeGateway: z.string().optional(),
  currency: z.string().optional(),
  stripeEnabled: z.boolean().optional(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  paypalEnabled: z.boolean().optional(),
  paypalClientId: z.string().optional().nullable(),
  paypalSecret: z.string().optional().nullable(),
  paypalMode: z.string().optional(),
  freeVerifyLimit: z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const body = await req.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const data = result.data;
    const [existing] = await db
      .select({ id: paymentSettingsTable.id })
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    const updates: any = { updatedAt: new Date() };
    if (data.activeGateway !== undefined) updates.gateway = data.activeGateway;
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.stripeEnabled !== undefined) updates.stripeEnabled = data.stripeEnabled;
    if (data.stripePublishableKey !== undefined) updates.stripePublishableKey = data.stripePublishableKey;
    if (data.stripeSecretKey !== undefined) updates.stripeSecretKey = data.stripeSecretKey;
    if (data.stripeWebhookSecret !== undefined) updates.stripeWebhookSecret = data.stripeWebhookSecret;
    if (data.paypalEnabled !== undefined) updates.paypalEnabled = data.paypalEnabled;
    if (data.paypalClientId !== undefined) updates.paypalClientId = data.paypalClientId;
    if (data.paypalSecret !== undefined) updates.paypalSecret = data.paypalSecret;
    if (data.paypalMode !== undefined) updates.paypalMode = data.paypalMode;
    if (data.freeVerifyLimit !== undefined) updates.freeVerifyLimit = data.freeVerifyLimit ?? 5;

    if (!existing) {
      await db.insert(paymentSettingsTable).values({ id: 1, ...updates });
    } else {
      await db.update(paymentSettingsTable).set(updates).where(eq(paymentSettingsTable.id, 1));
    }

    return NextResponse.json({ message: "Settings updated" });
  } catch (err) {
    console.error("[PaymentSettings POST Error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
