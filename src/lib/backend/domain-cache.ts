import { db, domainsTable, whitelistTable } from "@/lib/db";

let domainSet = new Set<string>();
let whitelistSet = new Set<string>();
let lastLoaded: Date | null = null;

export async function loadDomainCache(): Promise<void> {
  const domains = await db.select({ domain: domainsTable.domain }).from(domainsTable);
  const whitelisted = await db.select({ domain: whitelistTable.domain }).from(whitelistTable);
  
  domainSet = new Set(domains.map((d: { domain: string }) => d.domain.toLowerCase()));
  whitelistSet = new Set(whitelisted.map((d: { domain: string }) => d.domain.toLowerCase()));
  lastLoaded = new Date();
}

export function isDisposableDomain(domain: string): boolean {
  const clean = domain.toLowerCase().trim();
  if (whitelistSet.has(clean)) return false;
  return domainSet.has(clean);
}

export function getCacheSize(): number {
  return domainSet.size;
}

export function getLastLoaded(): Date | null {
  return lastLoaded;
}

export async function syncDomainsFromGitHub(): Promise<{ added: number; total: number }> {
  const sources = [
    {
      name: "disposable-email-domains",
      url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    },
    {
      name: "doodad-labs",
      url: "https://raw.githubusercontent.com/doodad-labs/disposable-email-domains/main/data/domains.txt",
    },
  ];

  const whitelisted = await db.select({ domain: whitelistTable.domain }).from(whitelistTable);
  const currentWhitelist = new Set(whitelisted.map((d: { domain: string }) => d.domain.toLowerCase()));

  let addedCount = 0;

  for (const source of sources) {
    try {
      const response = await fetch(source.url);
      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const domains = text
        .split("\n")
        .map((line) => line.trim().toLowerCase())
        .filter((line) => {
          if (line.length === 0 || line.startsWith("#") || line.startsWith("//")) return false;
          return !currentWhitelist.has(line);
        });

      const batchSize = 500;
      for (let i = 0; i < domains.length; i += batchSize) {
        const batch = domains.slice(i, i + batchSize).map((domain) => ({
          domain,
          source: source.name,
        }));

        try {
          const result = await db
            .insert(domainsTable)
            .values(batch)
            .onConflictDoNothing();
          addedCount += result.rowCount ?? 0;
        } catch {
          // ignore batch errors
        }
      }
    } catch (err) {
      // ignore source errors
    }
  }

  await loadDomainCache();

  return { added: addedCount, total: domainSet.size };
}
