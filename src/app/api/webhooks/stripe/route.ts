import { NextRequest, NextResponse } from "next/server";
import { db, usersTable, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getPlanConfig } from "@/lib/backend/auth";
import Stripe from "stripe";
import { logger } from "@/lib/backend/logger";

export async function POST(req: NextRequest) {
  try {
    const [settings] = await db
      .select()
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);

    if (!settings?.stripeSecretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
    }

    const stripe = new Stripe(settings.stripeSecretKey);
    const sig = req.headers.get("stripe-signature");

    if (!settings.stripeWebhookSecret || !sig) {
      return NextResponse.json({ error: "Missing webhook secret or signature" }, { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, settings.stripeWebhookSecret);
    } catch (err: any) {
      logger.warn({ err: err.message }, "Stripe webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
      const plan = session.metadata?.plan;

      if (userId && plan && session.payment_status === "paid") {
        const config = await getPlanConfig(plan);
        const requestLimit = session.metadata?.credits ? parseInt(session.metadata.credits) : config.requestLimit;
        
        await db.update(usersTable)
          .set({ plan, requestLimit, requestCount: 0 })
          .where(eq(usersTable.id, userId));
          
        logger.info({ userId, plan, requestLimit }, "Plan upgraded with custom credits via Stripe webhook");
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error({ err: err.message }, "Stripe webhook error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

