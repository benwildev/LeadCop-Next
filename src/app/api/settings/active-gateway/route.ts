import { NextResponse } from "next/server";
import { db, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [settings] = await db
      .select({
        gateway: paymentSettingsTable.gateway,
        stripeEnabled: paymentSettingsTable.stripeEnabled,
        stripePublishableKey: paymentSettingsTable.stripePublishableKey,
        paypalEnabled: paymentSettingsTable.paypalEnabled,
        paypalClientId: paymentSettingsTable.paypalClientId,
        paypalMode: paymentSettingsTable.paypalMode,
        planPrices: paymentSettingsTable.planPrices,
      })
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings) {
      return NextResponse.json({
        gateway: "MANUAL",
        stripePublishableKey: null,
        paypalClientId: null,
        paypalMode: "sandbox",
        planPrices: { BASIC: 9, PRO: 29 },
      });
    }

    const gw = settings.gateway;
    const effectiveGateway =
      (gw === "STRIPE" && !settings.stripeEnabled) ||
      (gw === "PAYPAL" && !settings.paypalEnabled)
        ? "MANUAL"
        : gw;

    return NextResponse.json({
      gateway: effectiveGateway,
      stripePublishableKey: effectiveGateway === "STRIPE" ? (settings.stripePublishableKey || null) : null,
      paypalClientId: effectiveGateway === "PAYPAL" ? (settings.paypalClientId || null) : null,
      paypalMode: settings.paypalMode,
      planPrices: settings.planPrices || { BASIC: 9, PRO: 29 },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
