const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "fastmail.com", "tutanota.com",
  "hey.com", "msn.com", "me.com", "mac.com", "pm.me",
]);

const ROLE_ACCOUNTS = new Set([
  "admin", "webmaster", "postmaster", "support", "help", "info", "contact",
  "sales", "billing", "account", "accounts", "hello", "hi", "team", "marketing",
  "jobs", "hr", "office", "desk", "service", "customer", "press", "legal",
  "mail", "no-reply", "noreply", "newsletter", "alert", "alerts",
]);

export interface ReputationChecks {
  isDisposable: boolean;
  hasMx: boolean | undefined;
  hasInbox: boolean | undefined;
  isAdmin: boolean;
  isFree?: boolean;
  isDeliverable?: boolean;
  isCatchAll?: boolean;
  canConnect?: boolean;
  domain: string;
}

export function isRoleAccount(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase();
  return ROLE_ACCOUNTS.has(local);
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
  if (checks.isAdmin) score -= 10;
  
  if (checks.isFree) {
     score -= 5;
  }

  return Math.min(100, Math.max(0, score));
}
