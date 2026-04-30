import { NextRequest, NextResponse } from "next/server";
import {
  db,
  usersTable,
  apiUsageTable,
  userWebsitesTable,
  userPagesTable,
  userApiKeysTable,
  webhooksTable,
  customBlocklistTable,
} from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { isDisposableDomain } from "@/lib/backend/domain-cache";
import { getPlanConfig } from "@/lib/backend/auth";
import {
  computeReputationScore,
  computeRiskLevel,
  buildTags,
  isRoleAccount,
  isFreeEmail,
  checkDnsbl,
  getDomainSuggestion,
  isForwardingEmail,
  isForwardingMx,
} from "@/lib/backend/reputation";
import { fireWebhook } from "@/lib/backend/webhooks";
import { verifySmtp } from "@/lib/backend/smtp-verifier";
import { isValidTld } from "@/lib/backend/tld-validator";
import { checkRateLimit } from "@/lib/backend/redis";
import { getSession } from "@/lib/backend/session";
import { logger } from "@/lib/backend/logger";
import dns from "dns";

const dnsPromises = dns.promises;

const checkEmailSchema = z.object({
  email: z.string().email(),
  path: z.string().optional(),
});

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

export async function maybeResetMonthlyUsage(
  userId: number,
  usagePeriodStart: Date | null,
  requestCount: number
): Promise<number> {
  const now = new Date();
  if (usagePeriodStart) {
    const sameMonth =
      now.getFullYear() === usagePeriodStart.getFullYear() &&
      now.getMonth() === usagePeriodStart.getMonth();
    if (sameMonth) return requestCount;
  }

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  await db
    .update(usersTable)
    .set({ requestCount: 0, usagePeriodStart: periodStart })
    .where(eq(usersTable.id, userId));

  return 0;
}

async function resolveAuth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const session = await getSession();
  const sessionUserId = session?.userId;

  async function getEffectiveUser(userId: number) {
    const [user] = await db
      .select({ 
        id: usersTable.id, 
        requestCount: usersTable.requestCount, 
        plan: usersTable.plan, 
        usagePeriodStart: usersTable.usagePeriodStart, 
        blockFreeEmails: usersTable.blockFreeEmails, 
        parentId: usersTable.parentId 
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return null;

    let targetUser = user;
    if (user.parentId) {
      const [parent] = await db
        .select({ 
          id: usersTable.id, 
          requestCount: usersTable.requestCount, 
          plan: usersTable.plan, 
          usagePeriodStart: usersTable.usagePeriodStart, 
          blockFreeEmails: usersTable.blockFreeEmails 
        })
        .from(usersTable)
        .where(eq(usersTable.id, user.parentId))
        .limit(1);
      if (parent) {
        targetUser = parent as any;
      }
    }

    const requestCount = await maybeResetMonthlyUsage(targetUser.id, targetUser.usagePeriodStart, targetUser.requestCount);
    return { 
      userId: targetUser.id, 
      userPlan: targetUser.plan, 
      requestCount, 
      isApiKeyAuth: false, 
      blockFreeEmails: targetUser.blockFreeEmails 
    };
  }

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.apiKey, apiKey)).limit(1);
    if (user) {
      const eff = await getEffectiveUser(user.id);
      if (eff) eff.isApiKeyAuth = true;
      return eff;
    }
    const [namedKey] = await db.select({ userId: userApiKeysTable.userId }).from(userApiKeysTable).where(eq(userApiKeysTable.key, apiKey)).limit(1);
    if (namedKey) {
      const eff = await getEffectiveUser(namedKey.userId);
      if (eff) eff.isApiKeyAuth = true;
      return eff;
    }
    return null;
  }

  if (sessionUserId) {
    return await getEffectiveUser(sessionUserId);
  }

  // Fallback for same-origin demo (allows landing page widget to work without login)
  // NOTE: Origin/Referer headers can be spoofed by scripts/bots, so we add
  // a strict IP-based rate limit here to prevent free-quota abuse.
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const isSameOrigin = (origin && host && origin.includes(host)) || 
                       (referer && host && referer.includes(host));

  if (isSameOrigin) {
    // Rate limit unauthenticated demo requests: max 10 per IP per minute
    const demoAllowed = await checkRateLimit(`demo:${ip}`, 10);
    if (!demoAllowed) {
      return null; // Will result in 401; prevents quota drain by bots
    }

    // Use the demo user (ID 2) as a fallback for the landing page demo
    const demoUser = await getEffectiveUser(2);
    if (demoUser) {
      return { ...demoUser, isApiKeyAuth: false };
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuth(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, userPlan, requestCount, isApiKeyAuth, blockFreeEmails } = auth;
    const planConfig = await getPlanConfig(userPlan ?? "FREE");

    if (planConfig.requestLimit !== -1 && requestCount >= planConfig.requestLimit) {
      return NextResponse.json({ error: "Rate limit exceeded. Please upgrade your plan." }, { status: 429 });
    }

    if (isApiKeyAuth) {
      const authHeader = req.headers.get("authorization");
      const apiKey = authHeader?.slice(7) || "";
      const limitPerMinute = (planConfig.rateLimitPerSecond || 1) * 60;
      if (apiKey && !(await checkRateLimit(apiKey, limitPerMinute))) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }
    }

    const body = await req.json();
    const result = checkEmailSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { email } = result.data;
    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

    await db.update(usersTable).set({ requestCount: sql`${usersTable.requestCount} + 1` }).where(eq(usersTable.id, userId));

    // Performance: parallel checks
    const [localPart] = email.split("@");
    const isFree = isFreeEmail(domain);
    const isValidSyntax = z.string().email().safeParse(email).success;
    const tld = domain.split(".").pop() ?? "";
    const isInvalidTld = !isValidTld(tld);
    const roleAccount = isRoleAccount(localPart);
    
    const [blocked] = await db.select({ id: customBlocklistTable.id }).from(customBlocklistTable).where(and(eq(customBlocklistTable.userId, userId), eq(customBlocklistTable.domain, domain))).limit(1);
    const disposable = !!blocked || isDisposableDomain(domain);

    const [mxValidResult, dnsblHit] = await Promise.all([
      checkMx(domain),
      planConfig.hasAdvancedAnalytics ? checkDnsbl(domain) : Promise.resolve(null),
    ]);

    const isForwarding = isForwardingEmail(domain);
    const reputationScore = computeReputationScore({
      isDisposable: disposable,
      hasMx: mxValidResult,
      hasInbox: mxValidResult,
      isAdmin: roleAccount,
      isFree,
      domain,
      dnsblHit: dnsblHit === true ? true : undefined,
      isInvalidTld,
      isForwarding,
    });

    const tags = buildTags({
      isDisposable: disposable,
      roleAccount,
      freeProvider: isFree,
      dnsblHit: dnsblHit === true ? true : undefined,
      isInvalidTld,
      isForwarding,
    });

    const isDisposableResult = disposable || (blockFreeEmails && isFree);

    await db.insert(apiUsageTable).values({
      userId,
      endpoint: "/check-email",
      email,
      domain,
      isDisposable: isDisposableResult,
      reputationScore,
      source: req.headers.get("x-leadcop-source") || "api",
    });

    return NextResponse.json({
      isDisposable: isDisposableResult,
      isForwarding,
      domain,
      reputationScore,
      riskLevel: computeRiskLevel(reputationScore),
      tags,
      requestsRemaining: Math.max(0, (planConfig.requestLimit ?? 0) - (requestCount + 1)),
      isValidSyntax,
      isRoleAccount: roleAccount,
      isFreeEmail: isFree,
      didYouMean: getDomainSuggestion(domain),
      mxValid: mxValidResult,
      dnsblHit,
    });
  } catch (err) {
    logger.error({ err }, "Email Check Error");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
