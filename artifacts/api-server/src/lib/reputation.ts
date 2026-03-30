const FREE_EMAIL_PROVIDERS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "protonmail.com", "proton.me", "zoho.com",
  "yandex.com", "mail.com", "gmx.com", "fastmail.com", "tutanota.com",
  "hey.com", "msn.com", "me.com", "mac.com", "pm.me",
]);

export interface ReputationChecks {
  isDisposable: boolean;
  hasMx: boolean | undefined;
  hasInbox: boolean | undefined;
  domain: string;
}

export function computeReputationScore(checks: ReputationChecks): number {
  let score = 100;

  if (checks.isDisposable) score -= 60;
  if (checks.hasMx === false) score -= 20;
  if (checks.hasInbox === false) score -= 15;
  if (FREE_EMAIL_PROVIDERS.has(checks.domain.toLowerCase())) score -= 5;

  return Math.max(0, score);
}
