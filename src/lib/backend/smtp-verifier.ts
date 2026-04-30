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

const MAX_RETRIES = 0;
const INITIAL_RETRY_DELAY_MS = 5000;
const RETRY_MULTIPLIER = 2;

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

async function detectCatchAll(
  domain: string,
  mxRecords: { exchange: string; priority: number }[]
): Promise<boolean | null> {
  if (mxRecords.length === 0) return null;
  const primaryMx = mxRecords[0];
  const testAddresses = [
    `ts_test_${Math.random().toString(36).slice(2, 8)}@${domain}`,
    `ts_probe_${Math.random().toString(36).slice(2, 8)}@${domain}`,
  ];
  const codes = await Promise.all(
    testAddresses.map(addr => testSingleSmtpRcpt(primaryMx.exchange, addr))
  );
  const accepted = codes.filter(c => c === 250 || c === 251).length;
  const rejected = codes.filter(c => c === 550 || c === 553).length;
  const total = accepted + rejected;
  if (total === 0) return null;
  const acceptanceRate = accepted / total;
  if (acceptanceRate >= 0.7) return true;
  if (acceptanceRate <= 0.3) return false;
  return null;
}

function testSingleSmtpRcpt(host: string, testEmail: string): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    socket.setTimeout(5000);
    let buffer = "";
    let stage = 0;
    const cleanup = () => { socket.removeAllListeners(); socket.destroy(); };
    const sendCommand = (cmd: string) => { socket.write(cmd + "\r\n"); };
    const finish = (code: number | null) => { cleanup(); resolve(code); };
    const processResponse = () => {
      const parsed = readSmtpResponse(buffer);
      if (parsed.code === 0) return;
      buffer = parsed.remaining;
      const code = parsed.code;
      if (stage === 0 && code === 220) { sendCommand("EHLO leadcop.io"); stage = 1; }
      else if (stage === 1 && code === 250) { sendCommand("MAIL FROM:<verify@leadcop.io>"); stage = 2; }
      else if (stage === 2 && code === 250) { sendCommand(`RCPT TO:<${testEmail}>`); stage = 3; }
      else if (stage === 3) { sendCommand("QUIT"); finish(code); }
      if (buffer.length > 0) processResponse();
    };
    socket.on("data", (data) => { buffer += data.toString(); processResponse(); });
    socket.on("error", () => { cleanup(); resolve(null); });
    socket.on("timeout", () => { cleanup(); resolve(null); });
  });
}

async function performHandshakeWithRetry(
  records: { exchange: string; priority: number }[],
  email: string,
  domain: string,
  result: SmtpCheckResult
): Promise<SmtpCheckResult> {
  for (let mxIndex = 0; mxIndex < records.length; mxIndex++) {
    const mxRecord = records[mxIndex];
    const [mxResult, catchAllResult] = await Promise.all([
      attemptHandshake(mxRecord.exchange, email, domain, result),
      detectCatchAll(domain, records),
    ]);
    if (!mxResult.greylisted) {
      result.canConnect = mxResult.canConnect;
      result.mxAcceptsMail = mxResult.mxAcceptsMail;
      result.isDeliverable = mxResult.isDeliverable;
      result.hasInboxFull = mxResult.hasInboxFull;
      result.isDisabled = mxResult.isDisabled;
      result.isCatchAll = catchAllResult ?? mxResult.isCatchAll;
      return result;
    }
  }
  return result;
}

function readSmtpResponse(buffer: string): { code: number; lines: string[]; remaining: string } {
  const lines = buffer.split("\r\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const code = parseInt(line.slice(0, 3), 10);
    if (isNaN(code)) continue;
    if (line[3] === "-") continue;
    return { code, lines: lines.slice(0, i + 1), remaining: lines.slice(i + 1).join("\r\n") };
  }
  return { code: 0, lines: [], remaining: buffer };
}

async function attemptHandshake(
  host: string,
  email: string,
  domain: string,
  baseResult: SmtpCheckResult
): Promise<SmtpCheckResult> {
  const result: SmtpCheckResult = { ...baseResult, greylisted: false };
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: 25, timeout: 10000 });
    socket.setTimeout(12000);
    let buffer = "";
    let stage = 0;
    const cleanup = () => { socket.removeAllListeners(); socket.destroy(); };
    const sendCommand = (cmd: string) => { socket.setTimeout(12000); socket.write(cmd + "\r\n"); };
    const finish = () => { cleanup(); resolve(result); };
    const processResponse = () => {
      const parsed = readSmtpResponse(buffer);
      if (parsed.code === 0) return;
      buffer = parsed.remaining;
      const code = parsed.code;
      const fullText = parsed.lines.join(" ").toLowerCase();
      if (code === 450 || code === 451 || code === 452) { result.canConnect = true; result.greylisted = true; finish(); return; }
      if (code >= 500) {
        if (code === 552) result.hasInboxFull = true;
        if ((code === 550 || code === 553) && (fullText.includes("disabled") || fullText.includes("deactivated"))) result.isDisabled = true;
        if (stage < 3) { finish(); return; }
        sendCommand("QUIT"); finish(); return;
      }
      if (stage === 0 && code === 220) { result.canConnect = true; sendCommand("EHLO leadcop.io"); stage = 1; }
      else if (stage === 1 && code === 250) { sendCommand("MAIL FROM:<verify@leadcop.io>"); stage = 2; }
      else if (stage === 2 && code === 250) { result.mxAcceptsMail = true; sendCommand(`RCPT TO:<${email}>`); stage = 3; }
      else if (stage === 3) { if (code === 250 || code === 251) result.isDeliverable = true; sendCommand("QUIT"); finish(); }
      if (buffer.length > 0) processResponse();
    };
    socket.on("data", (data) => { buffer += data.toString(); processResponse(); });
    socket.on("error", () => { cleanup(); resolve(result); });
    socket.on("timeout", () => { cleanup(); resolve(result); });
  });
}
