import { NextRequest, NextResponse } from "next/server";
import { db, planConfigsTable, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";

const paypalCreateSchema = z.object({
  plan: z.enum(["BASIC", "PRO", "MAX"]),
  credits: z.number().optional(),
});

function calculateDynamicPrice(plan: string, credits: number): number {
  if (plan === "BASIC") {
    if (credits <= 5000) return 19;
    if (credits <= 10000) return 29;
    return 49;
  }
  if (plan === "PRO") {
    if (credits <= 50000) return 89;
    if (credits <= 100000) return 149;
    return 299;
  }
  if (plan === "MAX") {
    if (credits <= 500000) return 499;
    if (credits <= 1000000) return 899;
    return 1999;
  }
  return 0;
}

async function getPayPalToken(clientId: string, secret: string, mode: string) {
  const base = mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await resp.json() as { access_token?: string };
  return { token: data.access_token || "", base };
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = paypalCreateSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { plan, credits } = result.data;

    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings || settings.gateway !== "PAYPAL" || !settings.paypalEnabled || !settings.paypalClientId || !settings.paypalSecret) {
      return NextResponse.json({ error: "PayPal is not configured or not enabled" }, { status: 400 });
    }

    let requestLimit = credits || 0;
    let finalPrice = 0;

    if (credits) {
      finalPrice = calculateDynamicPrice(plan, credits);
    } else {
      const [planRow] = await db.select({ price: planConfigsTable.price }).from(planConfigsTable).where(eq(planConfigsTable.plan, plan)).limit(1);
      finalPrice = planRow?.price ?? (plan === "BASIC" ? 19 : 89);
      if (!requestLimit) {
        const planConfig = await getPlanConfig(plan);
        requestLimit = planConfig.requestLimit;
      }
    }

    const priceStr = finalPrice.toFixed(2);
    const { token, base } = await getPayPalToken(settings.paypalClientId, settings.paypalSecret, settings.paypalMode);

    const customId = `${user.id}:${plan}:${priceStr}:${requestLimit}`;

    const orderResp = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: "USD", value: priceStr },
            description: `LeadCop ${plan} Plan (${requestLimit.toLocaleString()} credits)`,
            custom_id: customId,
          },
        ],
      }),
    });

    const order = await orderResp.json() as { id?: string };
    if (!order.id) return NextResponse.json({ error: "Failed to create PayPal order" }, { status: 500 });

    return NextResponse.json({ orderId: order.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PayPal checkout failed" }, { status: 500 });
  }
}
