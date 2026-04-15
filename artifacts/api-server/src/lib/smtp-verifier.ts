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
    
    // Sort by priority (lowest first)
    records.sort((a, b) => a.priority - b.priority);
    result.mxRecords = records.map(r => r.exchange);
    
    const primaryMx = records[0].exchange;
    
    // Perform SMTP Handshake
    return await performHandshake(primaryMx, email, result);
  } catch (err) {
    return result;
  }
}

async function performHandshake(
  host: string,
  email: string,
  result: SmtpCheckResult
): Promise<SmtpCheckResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection(25, host);
    socket.setTimeout(10000); // 10s timeout

    let stage = 0; // 0: Connect, 1: HELO, 2: MAIL FROM, 3: RCPT TO, 4: QUIT
    const domain = email.split("@")[1];

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.on("connect", () => {
      result.canConnect = true;
    });

    socket.on("data", (data) => {
      const response = data.toString();
      const code = parseInt(response.slice(0, 3), 10);

      if (code >= 400) {
        // Handle specific error codes
        if (code === 552 || code === 452) result.hasInboxFull = true;
        if (code === 550 || code === 553) {
          // Could be invalid or disabled
          if (response.toLowerCase().includes("disabled") || response.toLowerCase().includes("deactivated")) {
            result.isDisabled = true;
          }
        }
        cleanup();
        return resolve(result);
      }

      if (stage === 0 && code === 220) {
        socket.write(`HELO leadcop.io\r\n`);
        stage = 1;
      } else if (stage === 1 && code === 250) {
        socket.write(`MAIL FROM:<verify@leadcop.io>\r\n`);
        stage = 2;
      } else if (stage === 2 && code === 250) {
        result.mxAcceptsMail = true;
        socket.write(`RCPT TO:<${email}>\r\n`);
        stage = 3;
      } else if (stage === 3 && code === 250) {
        result.isDeliverable = true;
        
        // CATCH-ALL CHECK: try a random address
        const randomEmail = `ts_verify_${Math.random().toString(36).slice(2, 10)}@${domain}`;
        socket.write(`RCPT TO:<${randomEmail}>\r\n`);
        stage = 4;
      } else if (stage === 4) {
        if (code === 250) {
          result.isCatchAll = true;
        }
        socket.write(`QUIT\r\n`);
        cleanup();
        resolve(result);
      }
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
