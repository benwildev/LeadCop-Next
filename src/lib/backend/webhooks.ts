import crypto from "crypto";
import dns from "dns";
import net from "net";

export interface WebhookPayload {
  event: "email.detected";
  email: string;
  domain: string;
  isDisposable: boolean;
  reputationScore: number;
  timestamp: string;
}

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

async function isSsrfSafe(rawUrl: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  const hostname = parsed.hostname;
  if (/^localhost$/i.test(hostname)) return false;
  if (net.isIP(hostname)) {
    return !PRIVATE_RANGES.some((rx) => rx.test(hostname));
  }
  try {
    const [v4Addrs, v6Addrs] = await Promise.allSettled([
      dns.promises.resolve4(hostname),
      dns.promises.resolve6(hostname),
    ]);
    const allIps: string[] = [
      ...(v4Addrs.status === "fulfilled" ? v4Addrs.value : []),
      ...(v6Addrs.status === "fulfilled" ? v6Addrs.value : []),
    ];
    if (allIps.length === 0) return false;
    return allIps.every((ip) => !PRIVATE_RANGES.some((rx) => rx.test(ip)));
  } catch {
    return false;
  }
}

export async function fireWebhook(
  url: string,
  secret: string | null,
  payload: WebhookPayload
): Promise<void> {
  const safe = await isSsrfSafe(url);
  if (!safe) return;
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "LeadCop-Webhook/1.0",
  };
  if (secret) {
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    headers["X-LeadCop-Signature"] = `sha256=${sig}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
  } catch {
    // ignore
  } finally {
    clearTimeout(timeout);
  }
}
