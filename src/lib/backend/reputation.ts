import dns from "dns";
import net from "net";
import crypto from "crypto";
import { isDisposableDomain } from "./domain-cache";
import { isValidTld } from "./tld-validator";

const dnsPromises = dns.promises;

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "fastmail.com", "tutanota.com",
  "hey.com", "msn.com", "me.com", "mac.com", "pm.me",
]);

const FORWARDING_PROVIDERS = new Set([
  "privaterelay.appleid.com",
  "mozmail.com",
  "duck.com",
  "anonaddy.me",
  "anonaddy.com",
  "simplelogin.com",
  "simplelogin.co",
  "simplelogin.me",
  "slmail.me",
  "maskemail.com",
  "fmemail.com",
  "relay.firefox.com",
]);

const RELAY_MX_SUFFIXES = [
  "simplelogin.co",
  "simplelogin.io",
  "simplelogin.me",
  "anonaddy.me",
  "anonaddy.com",
  "addy.io",
  "mozmail.com",
  "duck.com",
  "privaterelay.appleid.com",
  "mx-relay.appleid.com",
  "relay.firefox.com",
];

const ROLE_ACCOUNTS = new Set([
  "admin", "administrator", "info", "information", "noreply", "no-reply",
  "support", "contact", "help", "helpdesk", "billing", "sales",
  "marketing", "newsletter", "postmaster", "abuse", "security",
  "webmaster", "hostmaster", "mailer", "daemon", "root", "mail",
  "service", "notification", "notifications", "alerts", "alert",
  "feedback", "privacy", "legal", "careers", "jobs", "hr", "team",
  "donotreply", "do-not-reply", "bounce", "bounces",
  "hi", "hello", "desk", "customer", "press", "account", "accounts",
  "dev", "developer", "developers",
]);

const COMMON_TYPOS: Record<string, string> = {
  "gamil.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "hotmai.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yhaoo.com": "yahoo.com",
  "outook.com": "outlook.com",
  "icloud.co": "icloud.com",
  "protonmaill.com": "protonmail.com",
};

function getLevenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function getDomainSuggestion(domain: string): string | null {
  const lower = domain.toLowerCase();
  if (FREE_EMAIL_PROVIDERS.has(lower)) return null;
  if (COMMON_TYPOS[lower]) return COMMON_TYPOS[lower];
  const parts = lower.split(".");
  const tld = parts.pop();
  const base = parts.join(".");
  if (base === "gmail" && (tld === "co" || tld === "cm" || tld === "om")) return "gmail.com";
  if (base === "yahoo" && (tld === "co" || tld === "cm" || tld === "om")) return "yahoo.com";
  if (base === "hotmail" && (tld === "co" || tld === "cm")) return "hotmail.com";
  for (const provider of FREE_EMAIL_PROVIDERS) {
    if (Math.abs(lower.length - provider.length) > 1) continue;
    if (getLevenshteinDistance(lower, provider) === 1) return provider;
  }
  return null;
}

import { analyzeGibberish, analyzeDomainQuality } from "@/utils/gibberish";

export interface ReputationChecks {
  isDisposable: boolean;
  isInvalidTld?: boolean;
  isForwarding?: boolean;
  hasMx: boolean | undefined;
  hasInbox?: boolean | undefined;
  isAdmin?: boolean;
  isFree?: boolean;
  isDeliverable?: boolean;
  isCatchAll?: boolean | null;
  canConnect?: boolean;
  domain: string;
  dnsblHit?: boolean;
  smtpValid?: boolean | null;
  roleAccount?: boolean;
  gibberishScore?: number;
  domainQualityScore?: number;
}

export function isRoleAccount(localPart: string): boolean {
  const lower = localPart.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return ROLE_ACCOUNTS.has(lower);
}

export function performBasicSecurityChecks(email: string) {
  const parts = email.split("@");
  if (parts.length !== 2) return { allowed: false, reason: "Invalid email format" };
  const [localPart, domain] = parts;
  const cleanDomain = domain.toLowerCase().trim();
  const domainParts = cleanDomain.split(".");
  const tld = domainParts.pop() ?? "";
  const domainName = domainParts.join(".");

  if (!isValidTld(tld)) return { allowed: false, reason: "Invalid domain extension (TLD)" };
  
  const gibberishAnalysis = analyzeGibberish(localPart);
  const domainAnalysis = analyzeDomainQuality(domainName);

  if (isForwardingEmail(cleanDomain)) return { allowed: false, reason: "Email relay services are not allowed" };
  if (isDisposableDomain(cleanDomain)) return { allowed: false, reason: "Disposable email addresses are not allowed" };
  
  if (gibberishAnalysis.isGibberish) return { allowed: false, reason: "Suspicious email pattern detected" };
  if (domainName.length >= 5 && domainAnalysis.isGibberish) return { allowed: false, reason: "Suspicious domain name detected" };
  
  return { allowed: true };
}

export function isFreeEmail(domain: string): boolean { return FREE_EMAIL_PROVIDERS.has(domain.toLowerCase()); }
export function isForwardingEmail(domain: string): boolean { return FORWARDING_PROVIDERS.has(domain.toLowerCase()); }
export function isForwardingMx(mxRecords: string[]): boolean {
  if (!mxRecords || mxRecords.length === 0) return false;
  return mxRecords.some(mx => {
    const lowerMx = mx.toLowerCase();
    return RELAY_MX_SUFFIXES.some(suffix => lowerMx.endsWith(suffix));
  });
}

/**
 * Weighted Scoring System (0-100)
 * Weights:
 * - Disposable: -60
 * - No MX: -40
 * - High Gibberish: -30
 * - Low Domain Quality: -30
 * - Role Account: -15
 * - Forwarding: -25
 */
export function computeReputationScore(checks: ReputationChecks): number {
  let score = 100;
  
  // 1. Hard Signals (Disposable, Invalid TLD)
  if (checks.isDisposable) score -= 60;
  if (checks.isInvalidTld) score -= 100;
  
  // 2. Network Signals (MX, DNSBL)
  if (checks.hasMx === false) score -= 40;
  if (checks.dnsblHit === true) score -= 20;
  
  // 3. Quality Signals (Gibberish, Domain Quality)
  if (checks.gibberishScore && checks.gibberishScore > 0.6) score -= 30;
  else if (checks.gibberishScore && checks.gibberishScore > 0.4) score -= 15;
  
  if (checks.domainQualityScore && checks.domainQualityScore > 0.6) score -= 30;
  else if (checks.domainQualityScore && checks.domainQualityScore > 0.4) score -= 15;

  // 4. Identity Signals (Role, Forwarding, Free)
  if (checks.roleAccount) score -= 15;
  if (checks.isForwarding) score -= 25;
  if (checks.isFree || FREE_EMAIL_PROVIDERS.has(checks.domain.toLowerCase())) score -= 5;
  
  // 5. Verification Signals (SMTP)
  if (checks.smtpValid === false) score -= 20;
  if (checks.isCatchAll === true) score -= 15;
  
  return Math.min(100, Math.max(0, score));
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export function computeRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "low";
  if (score >= 50) return "medium";
  if (score >= 20) return "high";
  return "critical";
}

export interface TagSignals {
  isDisposable: boolean;
  isInvalidTld?: boolean;
  isForwarding?: boolean;
  catchAll?: boolean | null;
  roleAccount?: boolean;
  freeProvider: boolean;
  dnsblHit?: boolean;
}

export function buildTags(signals: TagSignals): string[] {
  const tags: string[] = [];
  if (signals.isDisposable) tags.push("disposable");
  if (signals.isInvalidTld) tags.push("invalid_tld");
  if (signals.isForwarding) tags.push("forwarder");
  if (signals.catchAll === true) tags.push("catch_all");
  if (signals.roleAccount === true) tags.push("role_account");
  if (signals.freeProvider) tags.push("free_provider");
  if (signals.dnsblHit === true) tags.push("dnsbl");
  return tags;
}

export async function checkDnsbl(domain: string): Promise<boolean | null> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    if (records.length === 0) return null;
    const mxHost = records.sort((a, b) => a.priority - b.priority)[0].exchange;
    const ipRecords = await dnsPromises.resolve4(mxHost).catch(() => null);
    if (!ipRecords || ipRecords.length === 0) return null;
    const ip = ipRecords[0];
    const reversed = ip.split(".").reverse().join(".");
    const lookupHost = `${reversed}.zen.spamhaus.org`;
    try {
      await dnsPromises.resolve4(lookupHost);
      return true;
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && (err as NodeJS.ErrnoException).code === "ENOTFOUND") return false;
      return null;
    }
  } catch { return null; }
}

async function runSmtpProbe(mxHost: string, fromEmail: string, rcptEmail: string, timeoutMs = 8000): Promise<{ result: boolean | null }> {
  return new Promise((resolve) => {
    let resolved = false;
    let buffer = "";
    const done = (result: boolean | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch { }
      resolve({ result });
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);
    let step = 0;
    const sendLine = (line: string) => { try { socket.write(line + "\r\n"); } catch { done(null); } };
    socket.on("error", () => done(null));
    socket.on("timeout", () => done(null));
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        if (line[3] === "-") continue;
        if (step === 0 && code === 220) {
          step = 1;
          sendLine(`EHLO leadcop-probe.local`);
        } else if (step === 1 && (code === 250 || code === 221)) {
          step = 2;
          sendLine(`MAIL FROM:<${fromEmail}>`);
        } else if (step === 2 && code === 250) {
          step = 3;
          sendLine(`RCPT TO:<${rcptEmail}>`);
        } else if (step === 3) {
          sendLine("QUIT");
          if (code === 250) done(true);
          else if (code === 550 || code === 551 || code === 552 || code === 553) done(false);
          else done(null);
        } else if (code >= 400) done(null);
      }
    });
  });
}

export async function smtpProbe(domain: string, rcptEmail: string, timeoutMs = 5000): Promise<boolean | null> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    if (records.length === 0) return null;
    const mxHost = records.sort((a, b) => a.priority - b.priority)[0].exchange;
    const { result } = await runSmtpProbe(mxHost, "probe@leadcop-verify.io", rcptEmail, timeoutMs);
    return result;
  } catch { return null; }
}

export async function catchAllProbe(domain: string, timeoutMs = 8000): Promise<boolean | null> {
  const randomLocal = `probe-${crypto.randomBytes(8).toString("hex")}`;
  const randomEmail = `${randomLocal}@${domain}`;
  const result = await smtpProbe(domain, randomEmail, timeoutMs);
  if (result === true) return true;
  if (result === false) return false;
  return null;
}

export { FREE_EMAIL_PROVIDERS };
