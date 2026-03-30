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

// RFC-1918 private ranges + loopback + link-local + APIPA
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

  // Only allow HTTPS (optionally HTTP for dev)
  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const hostname = parsed.hostname;

  // Reject bare "localhost" and variants
  if (/^localhost$/i.test(hostname)) return false;

  // If it's an IP literal, check directly
  if (net.isIP(hostname)) {
    return !PRIVATE_RANGES.some((rx) => rx.test(hostname));
  }

  // Resolve hostname and check all returned IPs
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
  // SSRF guard
  const safe = await isSsrfSafe(url);
  if (!safe) return;

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "TempShield-Webhook/1.0",
  };

  if (secret) {
    const sig = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    headers["X-TempShield-Signature"] = `sha256=${sig}`;
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
    // Silently ignore delivery failures (network errors, timeouts)
  } finally {
    clearTimeout(timeout);
  }
}
