import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, planConfigsTable, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";
import { redis } from "@/lib/backend/redis";

const paypalCaptureSchema = z.object({
  orderId: z.string().min(1),
});

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
    const result = paypalCaptureSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { orderId } = result.data;

    // Idempotency: reject already-processed orders using Redis
    const lockKey = `paypal_order:${orderId}`;
    const alreadyProcessed = await redis.get(lockKey);
    if (alreadyProcessed) return NextResponse.json({ error: "Order already processed" }, { status: 409 });

    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings || settings.gateway !== "PAYPAL" || !settings.paypalEnabled || !settings.paypalClientId || !settings.paypalSecret) {
      return NextResponse.json({ error: "PayPal is not configured or not enabled" }, { status: 400 });
    }

    const { token, base } = await getPayPalToken(settings.paypalClientId, settings.paypalSecret, settings.paypalMode);

    const orderFetchResp = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const orderData = await orderFetchResp.json() as any;
    const purchaseUnit = orderData.purchase_units?.[0];

    if (!purchaseUnit?.custom_id) return NextResponse.json({ error: "Order missing custom_id" }, { status: 400 });

    const parts = purchaseUnit.custom_id.split(":");
    if (parts.length < 3) return NextResponse.json({ error: "Malformed order custom_id" }, { status: 400 });

    const [orderUserId, orderPlan, orderPrice, orderCredits] = parts;

    if (parseInt(orderUserId) !== user.id) {
      return NextResponse.json({ error: "Order does not belong to this user" }, { status: 403 });
    }

    const captureResp = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const capture = await captureResp.json() as any;
    if (capture.status !== "COMPLETED") return NextResponse.json({ error: "Payment not completed" }, { status: 400 });

    // Mark order as processed in Redis (24h expiry)
    await redis.set(lockKey, "1", "EX", 86400);

    const config = await getPlanConfig(orderPlan);
    const finalCredits = orderCredits ? parseInt(orderCredits) : config.requestLimit;

    await db
      .update(usersTable)
      .set({ plan: orderPlan, requestLimit: finalCredits, requestCount: 0 })
      .where(eq(usersTable.id, user.id));

    return NextResponse.json({ message: `Plan upgraded to ${orderPlan} via PayPal` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "PayPal capture failed" }, { status: 500 });
  }
}
