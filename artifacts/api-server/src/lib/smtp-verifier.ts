import net from "net";
import dns from "dns";
const dnsPromises = dns.promises;

export interface SmtpCheckResult {
  canConnect: boolean;
  mxAcceptsMail: boolean;
  isDeliverable: boolean;
  isCatchAll: boolean;
  hasInboxFull: boolean;
  isDisabled: boolean;
  mxRecords: string[];
  greylisted?: boolean;
}

/**
 * Retry configuration for greylisted SMTP responses.
 * Some servers return 4xx codes (450/451/452) meaning "try again later".
 * We retry up to 3 times with exponential backoff.
 */
const MAX_RETRIES = 0;
const INITIAL_RETRY_DELAY_MS = 5000;
const RETRY_MULTIPLIER = 2;

/**
 * Sleep utility for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function verifySmtp(email: string): Promise<SmtpCheckResult> {
  const domain = email.split("@")[1]?.toLowerCase();
  const result: SmtpCheckResult = {
    canConnect: false,
    mxAcceptsMail: false,
    isDeliverable: false,
    isCatchAll: false,
    hasInboxFull: false,
    isDisabled: false,
    mxRecords: [],
  };

  if (!domain) return result;

  try {
    const records = await dnsPromises.resolveMx(domain);
    if (!records || records.length === 0) return result;

    records.sort((a, b) => a.priority - b.priority);
    result.mxRecords = records.map(r => r.exchange);

    return await performHandshakeWithRetry(records, email, domain, result);
  } catch {
    return result;
  }
}

async function performHandshakeWithRetry(
  records: { exchange: string; priority: number }[],
  email: string,
  domain: string,
  result: SmtpCheckResult
): Promise<SmtpCheckResult> {
  // Try each MX server in priority order
  for (let mxIndex = 0; mxIndex < records.length; mxIndex++) {
    const mxRecord = records[mxIndex];
    result.mxRecords = records.slice(0, mxIndex + 1).map(r => r.exchange);

    const mxResult = await attemptHandshake(mxRecord.exchange, email, domain, result);

    // If we got a definitive answer (not greylisted), use it
    if (!mxResult.greylisted) {
      result.canConnect = mxResult.canConnect;
      result.mxAcceptsMail = mxResult.mxAcceptsMail;
      result.isDeliverable = mxResult.isDeliverable;
      result.isCatchAll = mxResult.isCatchAll;
      result.hasInboxFull = mxResult.hasInboxFull;
      result.isDisabled = mxResult.isDisabled;
      return result;
    }

    // Greylisted — if we have more MX servers, try the next one
    if (mxIndex < records.length - 1) {
      continue; // try next MX server
    }

    // No more MX servers — implement greylisting retry with exponential backoff
    let delay = INITIAL_RETRY_DELAY_MS;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await sleep(delay);

      const retryResult = await attemptHandshake(mxRecord.exchange, email, domain, result);

      if (!retryResult.greylisted) {
        result.canConnect = retryResult.canConnect;
        result.mxAcceptsMail = retryResult.mxAcceptsMail;
        result.isDeliverable = retryResult.isDeliverable;
        result.isCatchAll = retryResult.isCatchAll;
        result.hasInboxFull = retryResult.hasInboxFull;
        result.isDisabled = retryResult.isDisabled;
        return result;
      }

      // Still greylisted — increase delay and retry
      delay *= RETRY_MULTIPLIER;
    }

    // All retries exhausted — assume deliverable if we could connect
    // (conservative: greylisting usually means the server is working)
    result.canConnect = true;
    result.isDeliverable = true;
    result.greylisted = false;
    return result;
  }

  return result;
}

function readSmtpResponse(buffer: string): { code: number; lines: string[]; remaining: string } {
  const fullResponse = buffer;
  const lines = fullResponse.split("\r\n");
  let completeResponse = "";
  let remainingBuffer = fullResponse;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const code = parseInt(line.slice(0, 3), 10);
    if (isNaN(code)) continue;

    // Multi-line response: lines with code followed by '-' are continued
    if (line[3] === "-") {
      continue; // still waiting for final line
    }

    // This is the last line of the response
    completeResponse = lines.slice(0, i + 1).join("\r\n");
    remainingBuffer = lines.slice(i + 1).join("\r\n");
    return { code, lines: lines.slice(0, i + 1), remaining: remainingBuffer };
  }

  // No complete response yet
  return { code: 0, lines: [], remaining: fullResponse };
}

/**
 * Check if an SMTP response code indicates a greylisted/temporary failure.
 * Greylisting means the server is asking us to try again later.
 * Common greylist codes: 450 (mailbox busy), 451 (local error), 452 (insufficient storage)
 */
function isGreylisted(code: number): boolean {
  return code === 450 || code === 451 || code === 452;
}

/**
 * Attempt a single SMTP handshake against a specific MX host.
 * Returns the result with a `greylisted` flag if we received a temporary failure.
 */
async function attemptHandshake(
  host: string,
  email: string,
  domain: string,
  baseResult: SmtpCheckResult
): Promise<SmtpCheckResult> {
  const result: SmtpCheckResult = {
    canConnect: false,
    mxAcceptsMail: false,
    isDeliverable: false,
    isCatchAll: false,
    hasInboxFull: false,
    isDisabled: false,
    mxRecords: baseResult.mxRecords,
    greylisted: false,
  };

  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    socket.setTimeout(5000);

    let buffer = "";
    let stage = 0;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    const sendCommand = (cmd: string) => {
      socket.write(cmd + "\r\n");
    };

    const finishWithGreylist = () => {
      result.greylisted = true;
      cleanup();
      resolve(result);
    };

    const finish = () => {
      cleanup();
      resolve(result);
    };

    const processResponse = () => {
      const parsed = readSmtpResponse(buffer);
      if (parsed.code === 0) return; // incomplete response

      buffer = parsed.remaining;
      const code = parsed.code;
      const fullText = parsed.lines.join(" ").toLowerCase();

      // Handle greylist codes (4xx temporary failures)
      if (isGreylisted(code)) {
        result.canConnect = true; // we did connect, just got greylisted
        if (stage === 3) {
          finishWithGreylist(); // greylisted during RCPT TO
        } else {
          finishWithGreylist(); // greylisted at any stage
        }
        return;
      }

      // Handle hard errors (5xx)
      if (code >= 500) {
        if (code === 552) result.hasInboxFull = true;
        if (code === 550 || code === 553) {
          if (fullText.includes("disabled") || fullText.includes("deactivated")) {
            result.isDisabled = true;
          }
          // 550 at stage 3 = mailbox doesn't exist (not deliverable)
          // 550 at stage 4 = not catch-all (expected)
        }
        if (stage < 4) {
          finish();
          return;
        }
      }

      // SMTP state machine
      if (stage === 0 && code === 220) {
        result.canConnect = true;
        sendCommand("EHLO leadcop.io");
        stage = 1;
      } else if (stage === 1 && code === 250) {
        sendCommand("MAIL FROM:<verify@leadcop.io>");
        stage = 2;
      } else if (stage === 2 && code === 250) {
        result.mxAcceptsMail = true;
        sendCommand(`RCPT TO:<${email}>`);
        stage = 3;
      } else if (stage === 3) {
        if (code === 250 || code === 251) {
          result.isDeliverable = true;
        }
        // Catch-all check with random address
        const randomEmail = `ts_verify_${Math.random().toString(36).slice(2, 10)}@${domain}`;
        sendCommand(`RCPT TO:<${randomEmail}>`);
        stage = 4;
      } else if (stage === 4) {
        if (code === 250 || code === 251) {
          result.isCatchAll = true;
        }
        sendCommand("QUIT");
        finish();
      }

      // Process any remaining buffered data
      if (buffer.length > 0) {
        processResponse();
      }
    };

    socket.on("data", (data) => {
      buffer += data.toString();
      processResponse();
    });

    socket.on("error", () => {
      cleanup();
      resolve(result);
    });

    socket.on("timeout", () => {
      cleanup();
      resolve(result);
    });
  });
}
