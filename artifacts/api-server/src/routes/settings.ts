import { Router } from "express";
import { db, paymentSettingsTable, planConfigsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/active-gateway", async (_req, res) => {
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
    res.json({
      gateway: "MANUAL",
      stripePublishableKey: null,
      paypalClientId: null,
      paypalMode: "sandbox",
      planPrices: { BASIC: 9, PRO: 29 },
    });
    return;
  }

  const gw = settings.gateway;

  // If the active gateway has been explicitly disabled, fall back to MANUAL
  const effectiveGateway =
    (gw === "STRIPE" && !settings.stripeEnabled) ||
    (gw === "PAYPAL" && !settings.paypalEnabled)
      ? "MANUAL"
      : gw;

  res.json({
    gateway: effectiveGateway,
    stripePublishableKey: effectiveGateway === "STRIPE" ? (settings.stripePublishableKey || null) : null,
    paypalClientId: effectiveGateway === "PAYPAL" ? (settings.paypalClientId || null) : null,
    paypalMode: settings.paypalMode,
    planPrices: settings.planPrices || { BASIC: 9, PRO: 29 },
  });
});

// Public endpoint — returns plan names, prices and limits for the pricing page
router.get("/plans", async (_req, res) => {
  const configs = await db
    .select({
      plan: planConfigsTable.plan,
      price: planConfigsTable.price,
      requestLimit: planConfigsTable.requestLimit,
      websiteLimit: planConfigsTable.websiteLimit,
      mxDetectionEnabled: planConfigsTable.mxDetectionEnabled,
      inboxCheckEnabled: planConfigsTable.inboxCheckEnabled,
    })
    .from(planConfigsTable)
    .orderBy(planConfigsTable.id);
  res.json({ plans: configs });
});

export default router;
