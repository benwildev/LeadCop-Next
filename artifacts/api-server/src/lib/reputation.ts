import dns from "dns";
import net from "net";
import crypto from "crypto";

const dnsPromises = dns.promises;

const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "fastmail.com", "tutanota.com",
  "hey.com", "msn.com", "me.com", "mac.com", "pm.me",
]);

const ROLE_ACCOUNTS = new Set([
  "admin", "administrator", "info", "information", "noreply", "no-reply",
  "support", "contact", "help", "helpdesk", "billing", "sales",
  "marketing", "newsletter", "postmaster", "abuse", "security",
  "webmaster", "hostmaster", "mailer", "daemon", "root", "mail",
  "service", "notification", "notifications", "alerts", "alert",
  "feedback", "privacy", "legal", "careers", "jobs", "hr", "team",
  "donotreply", "do-not-reply", "bounce", "bounces",
  "hi", "hello", "desk", "customer", "press", "account", "accounts",
]);

export interface ReputationChecks {
  isDisposable: boolean;
  hasMx: boolean | undefined;
  hasInbox: boolean | undefined;
  isAdmin?: boolean;
  isFree?: boolean;
  isDeliverable?: boolean;
  isCatchAll?: boolean;
  canConnect?: boolean;
  domain: string;
  dnsblHit?: boolean;
  smtpValid?: boolean | null;
  roleAccount?: boolean;
}

export function isRoleAccount(localPart: string): boolean {
  const lower = localPart.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return ROLE_ACCOUNTS.has(lower);
}

export function isFreeEmail(domain: string): boolean {
  return FREE_EMAIL_PROVIDERS.has(domain.toLowerCase());
}

export function computeReputationScore(checks: ReputationChecks): number {
  let score = 100;

  if (checks.isDisposable) score -= 60;
  if (checks.hasMx === false) score -= 25;
  if (checks.hasInbox === false) score -= 15;
  
  if (checks.isDeliverable === false) score -= 40;
  if (checks.isCatchAll === true) score -= 20;
  if (checks.canConnect === false) score -= 20;
  if (checks.isAdmin || checks.roleAccount) score -= 10;
  
  if (checks.isFree || FREE_EMAIL_PROVIDERS.has(checks.domain.toLowerCase())) {
     score -= 5;
  }
  
  if (checks.dnsblHit === true) score -= 20;
  if (checks.smtpValid === false) score -= 10;

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
  catchAll?: boolean | null;
  roleAccount?: boolean;
  freeProvider: boolean;
  dnsblHit?: boolean;
}

export function buildTags(signals: TagSignals): string[] {
  const tags: string[] = [];
  if (signals.isDisposable) tags.push("disposable");
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
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as NodeJS.ErrnoException).code === "ENOTFOUND"
      ) {
        return false;
      }
      return null;
    }
  } catch {
    return null;
  }
}

interface SmtpProbeResult {
  result: boolean | null;
}

async function runSmtpProbe(
  mxHost: string,
  fromEmail: string,
  rcptEmail: string,
  timeoutMs = 8000
): Promise<SmtpProbeResult> {
  return new Promise((resolve) => {
    let resolved = false;
    let buffer = "";

    const done = (result: boolean | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch {}
      resolve({ result });
    };

    const timer = setTimeout(() => done(null), timeoutMs);

    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);

    let step = 0;

    const sendLine = (line: string) => {
      try { socket.write(line + "\r\n"); } catch { done(null); }
    };

    socket.on("error", () => done(null));
    socket.on("timeout", () => done(null));

    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        const isContinuation = line[3] === "-";
        if (isContinuation) continue;

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
          if (code === 250) {
            done(true);
          } else if (code === 550 || code === 551 || code === 552 || code === 553) {
            done(false);
          } else {
            done(null);
          }
        } else if (code >= 400) {
          done(null);
        }
      }
    });
  });
}

export async function smtpProbe(
  domain: string,
  rcptEmail: string,
  timeoutMs = 8000
): Promise<boolean | null> {
  try {
    const records = await dnsPromises.resolveMx(domain);
    if (records.length === 0) return null;

    const mxHost = records.sort((a, b) => a.priority - b.priority)[0].exchange;
    const { result } = await runSmtpProbe(
      mxHost,
      "probe@leadcop-verify.io",
      rcptEmail,
      timeoutMs
    );
    return result;
  } catch {
    return null;
  }
}

export async function catchAllProbe(
  domain: string,
  timeoutMs = 8000
): Promise<boolean | null> {
  const randomLocal = `probe-${crypto.randomBytes(8).toString("hex")}`;
  const randomEmail = `${randomLocal}@${domain}`;
  const result = await smtpProbe(domain, randomEmail, timeoutMs);
  if (result === true) return true;
  if (result === false) return false;
  return null;
}

export { FREE_EMAIL_PROVIDERS };
