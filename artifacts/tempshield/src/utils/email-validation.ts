export const KNOWN_DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "10minutemail.com",
  "trashmail.com",
  "sharklasers.com",
  "muncloud.com",
  "getnada.com",
  "maildrop.cc",
  "temp-mail.org",
  "fakeinbox.com",
  "mohmal.com",
  "dispostable.com",
  "grr.la",
]);

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function extractDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() || "";
}

export function isKnownDisposable(email: string): boolean {
  return KNOWN_DISPOSABLE_DOMAINS.has(extractDomain(email));
}
