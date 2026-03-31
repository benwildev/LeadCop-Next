import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { sessionMiddleware } from "./middlewares/session.js";
import { loadDomainCache } from "./lib/domain-cache.js";
import { db, usersTable, paymentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getPlanConfig } from "./lib/auth.js";
import Stripe from "stripe";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

/**
 * CORS strategy:
 *
 * /api/check-email — public API endpoint embedded on customer websites (WordPress, Webflow, etc.)
 *   ✅ Allow ANY origin with `Access-Control-Allow-Origin: *`
 *   ✅ No credentials — auth travels in the Authorization header (Bearer API key)
 *   ✅ Preflight OPTIONS handled automatically
 *
 * All other /api/* routes — dashboard, auth, admin (only called from TempShield's own frontend)
 *   ✅ Reflect the actual request origin so session cookies work
 *   ✅ credentials: true allows cookies for session-based auth
 */
const corsMiddleware = cors((req: any, callback: (err: Error | null, options?: CorsOptions) => void) => {
  const isPublicEndpoint =
    req.path === "/api/check-email" || req.url === "/api/check-email" ||
    req.path === "/api/check-email/demo" || req.url === "/api/check-email/demo" ||
    req.path === "/api/check-emails/bulk" || (req.url ?? "").startsWith("/api/check-emails");

  if (isPublicEndpoint) {
    callback(null, {
      origin: "*",
      methods: ["POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: false,
    } satisfies CorsOptions);
  } else {
    callback(null, {
      origin: (origin, done) => done(null, origin || true),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    } satisfies CorsOptions);
  }
});

app.use(corsMiddleware);

// Stripe webhook — must come before express.json() so raw body is preserved
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const [settings] = await db.select().from(paymentSettingsTable).where(eq(paymentSettingsTable.id, 1)).limit(1);

  if (!settings?.stripeSecretKey) {
    res.status(400).json({ error: "Stripe not configured" });
    return;
  }

  const stripe = new Stripe(settings.stripeSecretKey);
  const sig = req.headers["stripe-signature"];

  if (!settings.stripeWebhookSecret || !sig) {
    res.status(400).json({ error: "Missing webhook secret or signature" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, settings.stripeWebhookSecret);
  } catch (err) {
    logger.warn({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
    const plan = session.metadata?.plan;

    if (userId && plan && session.payment_status === "paid") {
      try {
        const config = await getPlanConfig(plan);
        await db.update(usersTable).set({ plan, requestLimit: config.requestLimit, requestCount: 0 }).where(eq(usersTable.id, userId));
        logger.info({ userId, plan }, "Plan upgraded via Stripe webhook");
      } catch (err) {
        logger.error({ err }, "Failed to upgrade plan after Stripe payment");
      }
    }
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);

app.use("/api", router);

import path from "path";
const frontendPath = path.resolve(import.meta.dirname, "../../tempshield/dist/public");
app.use(express.static(frontendPath));
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});

loadDomainCache().catch((err) => {
  logger.error({ err }, "Failed to load domain cache on startup");
});

export default app;
