import { NextRequest, NextResponse } from "next/server";
import { db, paymentSettingsTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { redis } from "@/lib/backend/redis";
import { isDisposableDomain } from "@/lib/backend/domain-cache";
import { verifySmtp, type SmtpCheckResult } from "@/lib/backend/smtp-verifier";
import { 
  computeReputationScore, 
  computeRiskLevel, 
  buildTags, 
  isRoleAccount, 
  isFreeEmail 
} from "@/lib/backend/reputation";
import dns from "dns";

const dnsPromises = dns.promises;
const FREE_VERIFY_COOKIE = "tempshield_free_verify";
const SESSION_TTL = 86400; // 24h in seconds

async function checkMx(domain: string): Promise<boolean> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    return records.length > 0;
  } catch {
    return false;
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

export async function GET(req: NextRequest) {
  const cookieId = req.cookies.get(FREE_VERIFY_COOKIE)?.value;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || (req as any).ip || "unknown";
  const limit = await getFreeVerifyLimit();

  const cookieKey = cookieId ? `free_sess:${cookieId}` : null;
  const ipKey = `free_ip:${ip}`;

  const [cookieCount, ipCount] = await Promise.all([
    cookieKey ? redis.get(cookieKey) : Promise.resolve(null),
    redis.get(ipKey),
  ]);

  const used = Math.max(Number(cookieCount || 0), Number(ipCount || 0));
  const remaining = Math.max(0, limit - used);

  return NextResponse.json({ used, limit, remaining, limitReached: remaining === 0 });
}

const freeVerifySchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().min(1, "Captcha token is required"),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || (req as any).ip || "unknown";
  const cookieId = req.cookies.get(FREE_VERIFY_COOKIE)?.value || Math.random().toString(36).substring(2);
  const limit = await getFreeVerifyLimit();

  const cookieKey = `free_sess:${cookieId}`;
  const ipKey = `free_ip:${ip}`;

  const [cookieCount, ipCount] = await Promise.all([
    redis.get(cookieKey),
    redis.get(ipKey),
  ]);

  const effectiveUsed = Math.max(Number(cookieCount || 0), Number(ipCount || 0));
  if (effectiveUsed >= limit) {
    return NextResponse.json({
      error: "You have used all your free checks. Sign up for a free account to get more.",
      used: effectiveUsed,
      limit,
      remaining: 0,
      limitReached: true,
    }, { status: 429 });
  }

  try {
    const body = await req.json();
    const result = freeVerifySchema.safeParse(body);
    if (!result.success) return NextResponse.json({ error: "Invalid email or captcha" }, { status: 400 });

    const { email, captchaToken } = result.data;

    // Optional: Add Google reCAPTCHA verification here if secret key is available in env
    
    const [localPart, domainRaw] = email.split("@");
    const domain = domainRaw?.toLowerCase() ?? "";

    const disposable = isDisposableDomain(domain);
    const roleAccount = isRoleAccount(localPart ?? "");
    const isFree = isFreeEmail(domain);

    let mxValid = false;
    let smtpResult: SmtpCheckResult = {
      canConnect: false, mxAcceptsMail: false, isDeliverable: false,
      isCatchAll: false, hasInboxFull: false, isDisabled: false, mxRecords: [],
    };

    if (!disposable) {
      mxValid = await checkMx(domain);
      // In free check, we might want to skip deep SMTP to save resources, or run a basic one
      smtpResult = await verifySmtp(email);
    }

    const reputationScore = computeReputationScore({
      isDisposable: disposable,
      hasMx: mxValid,
      hasInbox: smtpResult.isDeliverable,
      isAdmin: roleAccount,
      isFree,
      isDeliverable: smtpResult.isDeliverable,
      isCatchAll: smtpResult.isCatchAll,
      canConnect: smtpResult.canConnect,
      domain,
    });
    const riskLevel = computeRiskLevel(reputationScore);
    const tags = buildTags({ isDisposable: disposable, roleAccount, freeProvider: isFree });

    // Increment trackers
    await Promise.all([
      redis.incr(cookieKey),
      redis.expire(cookieKey, SESSION_TTL),
      redis.incr(ipKey),
      redis.expire(ipKey, SESSION_TTL),
    ]);

    const newUsed = effectiveUsed + 1;
    const response = NextResponse.json({
      email,
      domain,
      isDisposable: disposable,
      reputationScore,
      riskLevel,
      tags,
      isValidSyntax: true,
      isFreeEmail: isFree,
      isRoleAccount: roleAccount,
      mxValid,
      inboxSupport: smtpResult.isDeliverable,
      canConnectSmtp: smtpResult.canConnect,
      isDeliverable: smtpResult.isDeliverable,
      used: newUsed,
      limit,
      remaining: Math.max(0, limit - newUsed),
      limitReached: (limit - newUsed) <= 0,
    });

    response.cookies.set(FREE_VERIFY_COOKIE, cookieId, {
      httpOnly: true,
      maxAge: SESSION_TTL,
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
