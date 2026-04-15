import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { db, paymentSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isDisposableDomain } from "../lib/domain-cache.js";
import { verifySmtp } from "../lib/smtp-verifier.js";
import {
  computeReputationScore,
  computeRiskLevel,
  buildTags,
  isRoleAccount,
  isFreeEmail,
} from "../lib/reputation.js";
import dns from "dns";

const dnsPromises = dns.promises;

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
  }
}

const router = Router();

const FREE_VERIFY_COOKIE = "tempshield_free_verify";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

interface FreeSession {
  count: number;
  expiresAt: Date;
}

/** Cookie-keyed sessions — powers the "X of N used" counter in the UI */
const freeSessions = new Map<string, FreeSession>();

/**
 * IP-keyed sessions — the real abuse-prevention layer.
 * Clearing cookies does NOT reset this counter.
 */
const freeIpSessions = new Map<string, FreeSession>();

function pruneExpired() {
  const now = new Date();
  for (const [k, v] of freeSessions) {
    if (v.expiresAt < now) freeSessions.delete(k);
  }
  for (const [k, v] of freeIpSessions) {
    if (v.expiresAt < now) freeIpSessions.delete(k);
  }
}

async function getFreeVerifyLimit(): Promise<number> {
  try {
    const [row] = await db
      .select({ freeVerifyLimit: paymentSettingsTable.freeVerifyLimit })
      .from(paymentSettingsTable)
      .where(eq(paymentSettingsTable.id, 1))
      .limit(1);
    return row?.freeVerifyLimit ?? 5;
  } catch {
    return 5;
  }
}

function getOrCreateSession(
  map: Map<string, FreeSession>,
  key: string | undefined,
  autoCreate = true,
): { key: string; session: FreeSession; isNew: boolean } {
  pruneExpired();
  if (key) {
    const existing = map.get(key);
    if (existing && existing.expiresAt > new Date()) {
      return { key, session: existing, isNew: false };
    }
  }
  if (!autoCreate) {
    const stub: FreeSession = { count: 0, expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
    return { key: key ?? "__none__", session: stub, isNew: true };
  }
  const newKey = key && map !== freeSessions ? key : uuidv4();
  const session: FreeSession = { count: 0, expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
  map.set(newKey, session);
  return { key: newKey, session, isNew: true };
}

/** Extract a stable client identifier from the request (IP). */
function clientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress ?? "unknown";
}

const freeVerifySchema = z.object({
  email: z.string().email(),
});

// GET /api/verify/free/status — returns remaining checks for current session
router.get("/verify/free/status", async (req, res) => {
  const cookieId = req.cookies?.[FREE_VERIFY_COOKIE];
  const ip = clientIp(req);
  const limit = await getFreeVerifyLimit();

  const { key: sessionId, session: cookieSession, isNew: cookieIsNew } = getOrCreateSession(
    freeSessions,
    cookieId,
  );
  const { session: ipSession } = getOrCreateSession(freeIpSessions, ip);

  if (cookieIsNew) {
    res.cookie(FREE_VERIFY_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: SESSION_TTL_MS,
      sameSite: "lax",
      path: "/",
    });
  }

  // Effective used count is the higher of the two trackers
  const used = Math.max(cookieSession.count, ipSession.count);
  const remaining = Math.max(0, limit - used);
  res.json({ used, limit, remaining, limitReached: remaining === 0 });
});

// POST /api/verify/free — public email check, session + IP rate-limited
router.post("/verify/free", async (req, res) => {
  const cookieId = req.cookies?.[FREE_VERIFY_COOKIE];
  const ip = clientIp(req);
  const limit = await getFreeVerifyLimit();

  const { key: sessionId, session: cookieSession, isNew: cookieIsNew } = getOrCreateSession(
    freeSessions,
    cookieId,
  );
  const { session: ipSession } = getOrCreateSession(freeIpSessions, ip);

  if (cookieIsNew || !cookieId) {
    res.cookie(FREE_VERIFY_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: SESSION_TTL_MS,
      sameSite: "lax",
      path: "/",
    });
  }

  // Block if EITHER the cookie session OR the IP session is exhausted
  const effectiveUsed = Math.max(cookieSession.count, ipSession.count);
  const remaining = Math.max(0, limit - effectiveUsed);

  if (remaining === 0) {
    res.status(429).json({
      error: "You have used all your free checks. Sign up for a free account to get more.",
      used: effectiveUsed,
      limit,
      remaining: 0,
      limitReached: true,
    });
    return;
  }

  const parsed = freeVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  const { email } = parsed.data;
  const [localPart, domainRaw] = email.split("@");
  const domain = domainRaw?.toLowerCase() ?? "";

  const disposable = isDisposableDomain(domain);
  const roleAccount = isRoleAccount(localPart ?? "");
  const isFree = isFreeEmail(domain);

  // Run MX check
  const mxUsed = await checkMx(domain);

  // Run full SMTP verification
  const smtpResult = await verifySmtp(email);

  const reputationScore = computeReputationScore({
    isDisposable: disposable,
    hasMx: mxUsed,
    hasInbox: smtpResult.isDeliverable,
    isAdmin: roleAccount,
    isFree,
    isDeliverable: smtpResult.isDeliverable,
    isCatchAll: smtpResult.isCatchAll,
    canConnect: smtpResult.canConnect,
    domain,
  });
  const riskLevel = computeRiskLevel(reputationScore);
  const tags = buildTags({
    isDisposable: disposable,
    roleAccount,
    freeProvider: isFree,
  });

  // Increment both trackers together
  cookieSession.count += 1;
  ipSession.count += 1;

  const newUsed = Math.max(cookieSession.count, ipSession.count);
  const newRemaining = Math.max(0, limit - newUsed);

  res.json({
    email,
    domain,
    isDisposable: disposable,
    reputationScore,
    riskLevel,
    tags,
    isValidSyntax: true,
    isFreeEmail: isFree,
    isRoleAccount: roleAccount,
    mxValid: mxUsed,
    inboxSupport: smtpResult.isDeliverable,
    canConnectSmtp: smtpResult.canConnect,
    mxAcceptsMail: smtpResult.mxAcceptsMail,
    mxRecords: smtpResult.mxRecords,
    isDeliverable: smtpResult.isDeliverable,
    isCatchAll: smtpResult.isCatchAll,
    isDisabled: smtpResult.isDisabled,
    hasInboxFull: smtpResult.hasInboxFull,
    used: newUsed,
    limit,
    remaining: newRemaining,
    limitReached: newRemaining === 0,
  });
});

export default router;
