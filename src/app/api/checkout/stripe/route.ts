import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, planConfigsTable, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/backend/session";
import { getPlanConfig } from "@/lib/backend/auth";
import Stripe from "stripe";

const checkoutStripeSchema = z.object({
  plan: z.enum(["FREE", "BASIC", "PRO", "MAX"]),
  credits: z.number().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
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

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = checkoutStripeSchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const { plan, credits, successUrl, cancelUrl } = result.data;

    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings || settings.gateway !== "STRIPE" || !settings.stripeEnabled || !settings.stripeSecretKey) {
      return NextResponse.json({ error: "Stripe is not configured or not enabled" }, { status: 400 });
    }

    let priceInCents = 0;
    let requestLimit = credits || 0;

    if (credits) {
      priceInCents = Math.round(calculateDynamicPrice(plan, credits) * 100);
    } else {
      const [planRow] = await db.select({ price: planConfigsTable.price }).from(planConfigsTable).where(eq(planConfigsTable.plan, plan)).limit(1);
      priceInCents = Math.round((planRow?.price ?? (plan === "BASIC" ? 19 : 89)) * 100);
      if (!requestLimit) {
        const planConfig = await getPlanConfig(plan);
        requestLimit = planConfig.requestLimit;
      }
    }

    const stripe = new Stripe(settings.stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `LeadCop ${plan} Plan`,
              description: `${requestLimit.toLocaleString()} requests/month`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: user.email,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId: String(user.id),
        plan,
        credits: String(requestLimit),
        planPriceCents: String(priceInCents),
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
