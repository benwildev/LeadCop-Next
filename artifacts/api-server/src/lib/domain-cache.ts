import { db, domainsTable } from "@workspace/db";

let domainSet = new Set<string>();
let lastLoaded: Date | null = null;

export async function loadDomainCache(): Promise<void> {
  const domains = await db.select({ domain: domainsTable.domain }).from(domainsTable);
  domainSet = new Set(domains.map((d) => d.domain.toLowerCase()));
  lastLoaded = new Date();
}

export function isDisposableDomain(domain: string): boolean {
  return domainSet.has(domain.toLowerCase());
}

export function getCacheSize(): number {
  return domainSet.size;
}

export function getLastLoaded(): Date | null {
  return lastLoaded;
}

export async function syncDomainsFromGitHub(): Promise<{ added: number; total: number }> {
  const url =
    "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf";

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch domains: ${response.statusText}`);
  }

  const text = await response.text();
  const domains = text
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  let added = 0;
  const batchSize = 500;

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize).map((domain) => ({
      domain,
      source: "github",
    }));

    try {
      const result = await db
        .insert(domainsTable)
        .values(batch)
        .onConflictDoNothing();
      added += result.rowCount ?? 0;
    } catch {
    }
  }

  await loadDomainCache();

  return { added, total: domainSet.size };
}
