import { Router } from "express";
import type { Request } from "express";
import {
  db,
  usersTable,
  apiUsageTable,
  userWebsitesTable,
  userApiKeysTable,
  webhooksTable,
  customBlocklistTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { isDisposableDomain } from "../lib/domain-cache.js";
import { getPlanConfig } from "../lib/auth.js";
import { computeReputationScore } from "../lib/reputation.js";
import { fireWebhook } from "../lib/webhooks.js";
import dns from "dns";

const dnsPromises = dns.promises;

const router = Router();

const checkEmailSchema = z.object({
  email: z.string().email(),
});

const bulkCheckSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
});

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

async function checkInboxSupport(domain: string): Promise<boolean> {
  try {
    const [mxRecords, aRecords, aaaaRecords] = await Promise.allSettled([
      dnsPromises.resolveMx(domain),
      dnsPromises.resolve4(domain),
      dnsPromises.resolve6(domain),
    ]);
    const hasMx = mxRecords.status === "fulfilled" && mxRecords.value.length > 0;
    const hasA = aRecords.status === "fulfilled" && aRecords.value.length > 0;
    const hasAaaa = aaaaRecords.status === "fulfilled" && aaaaRecords.value.length > 0;
    return hasMx || hasA || hasAaaa;
  } catch {
    return false;
  }
}

async function countUsageByEndpoint(userId: number, endpoint: string): Promise<number> {
  const [{ cnt }] = await db
    .select({ cnt: sql<number>`COUNT(*)::int` })
    .from(apiUsageTable)
    .where(and(eq(apiUsageTable.userId, userId), eq(apiUsageTable.endpoint, endpoint)));
  return Number(cnt);
}

function extractRequestDomain(req: Request): string | null {
  const origin = req.headers["origin"];
  const referer = req.headers["referer"];
  const source =
    (Array.isArray(origin) ? origin[0] : origin) ||
    (Array.isArray(referer) ? referer[0] : referer);
  if (!source) return null;
  try {
    return new URL(source).hostname.toLowerCase();
  } catch {
    return null;
  }
}

interface AuthResult {
  userId: number;
  userPlan: string;
  requestCount: number;
  isApiKeyAuth: boolean;
}

/**
 * If the user's usagePeriodStart is in a past calendar month, reset their
 * requestCount to 0 and update usagePeriodStart to the start of this month.
 * Returns the (possibly reset) requestCount.
 */
async function maybeResetMonthlyUsage(
  userId: number,
  usagePeriodStart: Date,
  requestCount: number
): Promise<number> {
  const now = new Date();
  const sameMonth =
    now.getFullYear() === usagePeriodStart.getFullYear() &&
    now.getMonth() === usagePeriodStart.getMonth();

  if (sameMonth) return requestCount;

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  await db
    .update(usersTable)
    .set({ requestCount: 0, usagePeriodStart: periodStart })
    .where(eq(usersTable.id, userId));

  return 0;
}

async function resolveAuth(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.authorization;
  const sessionUserId = req.userId;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);

    // Check primary user api key
    const [user] = await db
      .select({ id: usersTable.id, requestCount: usersTable.requestCount, plan: usersTable.plan, usagePeriodStart: usersTable.usagePeriodStart })
      .from(usersTable)
      .where(eq(usersTable.apiKey, apiKey))
      .limit(1);

    if (user) {
      const requestCount = await maybeResetMonthlyUsage(user.id, user.usagePeriodStart, user.requestCount);
      return { userId: user.id, userPlan: user.plan, requestCount, isApiKeyAuth: true };
    }

    // Check named api keys
    const [namedKey] = await db
      .select({ userId: userApiKeysTable.userId })
      .from(userApiKeysTable)
      .where(eq(userApiKeysTable.key, apiKey))
      .limit(1);

    if (namedKey) {
      const [keyUser] = await db
        .select({ id: usersTable.id, requestCount: usersTable.requestCount, plan: usersTable.plan, usagePeriodStart: usersTable.usagePeriodStart })
        .from(usersTable)
        .where(eq(usersTable.id, namedKey.userId))
        .limit(1);
      if (keyUser) {
        const requestCount = await maybeResetMonthlyUsage(keyUser.id, keyUser.usagePeriodStart, keyUser.requestCount);
        return { userId: keyUser.id, userPlan: keyUser.plan, requestCount, isApiKeyAuth: true };
      }
    }

    return null;
  }

  if (sessionUserId) {
    const [user] = await db
      .select({ requestCount: usersTable.requestCount, plan: usersTable.plan, usagePeriodStart: usersTable.usagePeriodStart })
      .from(usersTable)
      .where(eq(usersTable.id, sessionUserId))
      .limit(1);

    if (!user) return null;

    const requestCount = await maybeResetMonthlyUsage(sessionUserId, user.usagePeriodStart, user.requestCount);
    return { userId: sessionUserId, userPlan: user.plan, requestCount, isApiKeyAuth: false };
  }

  return null;
}

async function checkOriginAllowed(req: Request, userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const allowedWebsites = await db
    .select({ domain: userWebsitesTable.domain })
    .from(userWebsitesTable)
    .where(eq(userWebsitesTable.userId, userId));

  if (allowedWebsites.length === 0) return { allowed: true };

  const requestDomain = extractRequestDomain(req);
  if (!requestDomain) {
    return { allowed: false, reason: "Origin header required. Your account has an allowed-websites list configured." };
  }

  const isAllowed = allowedWebsites.some(
    (w) => requestDomain === w.domain || requestDomain.endsWith(`.${w.domain}`)
  );

  if (!isAllowed) {
    return { allowed: false, reason: "Origin not in allowed websites list. Add your domain in dashboard settings." };
  }

  return { allowed: true };
}

async function performChecks(
  email: string,
  userId: number,
  planConfig: Awaited<ReturnType<typeof getPlanConfig>>
) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  // Custom blocklist (domain is already lowercased)
  const [blocked] = await db
    .select({ id: customBlocklistTable.id })
    .from(customBlocklistTable)
    .where(and(eq(customBlocklistTable.userId, userId), eq(customBlocklistTable.domain, domain)))
    .limit(1);

  const isCustomBlocked = !!blocked;
  const disposable = isCustomBlocked || isDisposableDomain(domain);

  let mxValidResult: boolean | undefined;
  let inboxSupportResult: boolean | undefined;

  if (planConfig.mxDetectionEnabled) {
    const mxDetectLimit = planConfig.mxDetectLimit;
    if (mxDetectLimit === 0) {
      mxValidResult = await checkMx(domain);
      await db.insert(apiUsageTable).values({ userId, endpoint: "/check-email/mx" });
    } else {
      const mxUsed = await countUsageByEndpoint(userId, "/check-email/mx");
      if (mxUsed < mxDetectLimit) {
        mxValidResult = await checkMx(domain);
        await db.insert(apiUsageTable).values({ userId, endpoint: "/check-email/mx" });
      } else {
        mxValidResult = false;
      }
    }
  }

  if (planConfig.inboxCheckEnabled) {
    const inboxCheckLimit = planConfig.inboxCheckLimit;
    if (inboxCheckLimit === 0) {
      inboxSupportResult = await checkInboxSupport(domain);
      await db.insert(apiUsageTable).values({ userId, endpoint: "/check-email/inbox" });
    } else {
      const inboxUsed = await countUsageByEndpoint(userId, "/check-email/inbox");
      if (inboxUsed < inboxCheckLimit) {
        inboxSupportResult = await checkInboxSupport(domain);
        await db.insert(apiUsageTable).values({ userId, endpoint: "/check-email/inbox" });
      } else {
        inboxSupportResult = false;
      }
    }
  }

  const reputationScore = computeReputationScore({
    isDisposable: disposable,
    hasMx: mxValidResult,
    hasInbox: inboxSupportResult,
    domain,
  });

  return { domain, disposable, mxValidResult, inboxSupportResult, reputationScore, isCustomBlocked };
}

/**
 * Dispatch webhooks — only fires when:
 *   1. The request was authenticated with an API key (not a session)
 *   2. The email is disposable
 */
async function dispatchWebhooks(
  userId: number,
  email: string,
  domain: string,
  isDisposable: boolean,
  reputationScore: number,
  isApiKeyAuth: boolean
) {
  if (!isApiKeyAuth || !isDisposable) return;

  // Verify user is still on PRO — webhooks are a PRO-only feature
  const [user] = await db
    .select({ plan: usersTable.plan })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!user || user.plan !== "PRO") return;

  const webhooks = await db
    .select()
    .from(webhooksTable)
    .where(and(eq(webhooksTable.userId, userId), eq(webhooksTable.enabled, true)));

  if (webhooks.length === 0) return;

  const EVENT = "email.detected" as const;

  const payload = {
    event: EVENT,
    email,
    domain,
    isDisposable,
    reputationScore,
    timestamp: new Date().toISOString(),
  };

  // Only fire webhooks that are subscribed to this event
  const subscribed = webhooks.filter(
    (wh) => Array.isArray(wh.events) && (wh.events as string[]).includes(EVENT)
  );

  if (subscribed.length === 0) return;

  // Fire in parallel, non-blocking
  Promise.allSettled(subscribed.map((wh) => fireWebhook(wh.url, wh.secret, payload)));
}

// ─── POST /api/check-email ─────────────────────────────────────────────────────

router.post("/check-email", async (req, res) => {
  const auth = await resolveAuth(req);

  if (!auth) {
    if (req.headers.authorization) {
      res.status(401).json({ error: "Invalid API key" });
    } else {
      res.status(401).json({ error: "API key required. Pass Authorization: Bearer <your_api_key>" });
    }
    return;
  }

  const { userId, userPlan, requestCount, isApiKeyAuth } = auth;
  const planConfig = await getPlanConfig(userPlan);

  if (requestCount >= planConfig.requestLimit) {
    res.status(429).json({ error: "Rate limit exceeded. Please upgrade your plan." });
    return;
  }

  if (isApiKeyAuth) {
    const origin = await checkOriginAllowed(req, userId);
    if (!origin.allowed) {
      res.status(403).json({ error: origin.reason });
      return;
    }
  }

  const result = checkEmailSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email } = result.data;
  const domain = email.split("@")[1]?.toLowerCase();

  if (!domain) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  await db.update(usersTable).set({ requestCount: requestCount + 1 }).where(eq(usersTable.id, userId));

  const checks = await performChecks(email, userId, planConfig);
  const requestsRemaining = Math.max(0, planConfig.requestLimit - (requestCount + 1));

  await db.insert(apiUsageTable).values({
    userId,
    endpoint: "/check-email",
    email,
    domain: checks.domain,
    isDisposable: checks.disposable,
    reputationScore: checks.reputationScore,
  });

  // Only fire webhooks for API key auth + disposable results
  void dispatchWebhooks(userId, email, checks.domain, checks.disposable, checks.reputationScore, isApiKeyAuth).catch(() => {});

  res.json({
    isDisposable: checks.disposable,
    domain: checks.domain,
    reputationScore: checks.reputationScore,
    requestsRemaining,
    ...(planConfig.mxDetectionEnabled ? { mxValid: checks.mxValidResult ?? false } : {}),
    ...(planConfig.inboxCheckEnabled ? { inboxSupport: checks.inboxSupportResult ?? false } : {}),
  });
});

// ─── POST /api/check-emails/bulk ─────────────────────────────────────────────

router.post("/check-emails/bulk", async (req, res) => {
  const auth = await resolveAuth(req);

  if (!auth) {
    if (req.headers.authorization) {
      res.status(401).json({ error: "Invalid API key" });
    } else {
      res.status(401).json({ error: "API key required. Pass Authorization: Bearer <your_api_key>" });
    }
    return;
  }

  const { userId, userPlan, requestCount, isApiKeyAuth } = auth;

  // Bulk verification is not available on FREE plan
  if (userPlan === "FREE") {
    res.status(403).json({
      error: "Bulk verification is not available on the FREE plan. Please upgrade to BASIC or PRO.",
    });
    return;
  }

  const result = bulkCheckSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: "Invalid request. Provide an 'emails' array with 1-100 valid email addresses." });
    return;
  }

  const { emails } = result.data;
  const planConfig = await getPlanConfig(userPlan);

  // Explicit quota check — refuse entire batch rather than silent truncation
  const remaining = planConfig.requestLimit - requestCount;
  if (remaining <= 0) {
    res.status(429).json({ error: "Rate limit exceeded. Please upgrade your plan." });
    return;
  }

  if (emails.length > remaining) {
    res.status(429).json({
      error: `Rate limit: only ${remaining} request(s) remaining but ${emails.length} emails submitted. Reduce batch size or upgrade your plan.`,
      requestsRemaining: remaining,
    });
    return;
  }

  if (isApiKeyAuth) {
    const origin = await checkOriginAllowed(req, userId);
    if (!origin.allowed) {
      res.status(403).json({ error: origin.reason });
      return;
    }
  }

  // Deduct from quota upfront
  await db
    .update(usersTable)
    .set({ requestCount: requestCount + emails.length })
    .where(eq(usersTable.id, userId));

  // Process all emails in parallel
  const results = await Promise.all(
    emails.map(async (email) => {
      try {
        const checks = await performChecks(email, userId, planConfig);
        await db.insert(apiUsageTable).values({
          userId,
          endpoint: "/check-emails/bulk",
          email,
          domain: checks.domain,
          isDisposable: checks.disposable,
          reputationScore: checks.reputationScore,
        });

        // Only fire webhooks for API key auth + disposable results
        void dispatchWebhooks(userId, email, checks.domain, checks.disposable, checks.reputationScore, isApiKeyAuth).catch(() => {});

        return {
          email,
          isDisposable: checks.disposable,
          domain: checks.domain,
          reputationScore: checks.reputationScore,
          ...(planConfig.mxDetectionEnabled ? { mxValid: checks.mxValidResult ?? false } : {}),
          ...(planConfig.inboxCheckEnabled ? { inboxSupport: checks.inboxSupportResult ?? false } : {}),
        };
      } catch {
        return { email, error: "Failed to check email" };
      }
    })
  );

  const disposableCount = results.filter((r) => !("error" in r) && r.isDisposable).length;

  res.json({
    results,
    totalChecked: emails.length,
    disposableCount,
  });
});

export default router;
