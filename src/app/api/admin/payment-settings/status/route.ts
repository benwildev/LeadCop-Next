import { NextResponse } from "next/server";
import { db, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/backend/session";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Access Denied" }, { status: 403 });

  try {
    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings) {
      return NextResponse.json({
        stripe: { status: "unconfigured" },
        paypal: { status: "unconfigured" },
      });
    }

    const stripeHasKeys = !!(settings.stripePublishableKey && settings.stripeSecretKey);
    const paypalHasKeys = !!(settings.paypalClientId && settings.paypalSecret);

    return NextResponse.json({
      stripe: {
        status: settings.stripeEnabled && stripeHasKeys ? "ready" : settings.stripeEnabled ? "error" : "unconfigured",
      },
      paypal: {
        status: settings.paypalEnabled && paypalHasKeys ? "ready" : settings.paypalEnabled ? "error" : "unconfigured",
      },
    });
  } catch (err) {
    console.error("[PaymentSettingsStatus API Error]", err);
    return NextResponse.json({ 
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
