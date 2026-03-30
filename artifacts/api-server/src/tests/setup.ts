import { beforeAll, afterAll } from "vitest";
import {
  db,
  pool,
  planConfigsTable,
  usersTable,
  domainsTable,
  apiUsageTable,
  userApiKeysTable,
  webhooksTable,
  customBlocklistTable,
  upgradeRequestsTable,
  userPagesTable,
  userWebsitesTable,
} from "@workspace/db";
import { hashPassword, generateApiKey } from "../lib/auth.js";
import { loadDomainCache } from "../lib/domain-cache.js";

beforeAll(async () => {
  await db.delete(userPagesTable);
  await db.delete(userWebsitesTable);
  await db.delete(upgradeRequestsTable);
  await db.delete(customBlocklistTable);
  await db.delete(webhooksTable);
  await db.delete(userApiKeysTable);
  await db.delete(apiUsageTable);
  await db.delete(usersTable);
  await db.delete(planConfigsTable);
  await db.delete(domainsTable);

  await db.insert(planConfigsTable).values([
    {
      plan: "FREE",
      requestLimit: 10,
      mxDetectLimit: 0,
      inboxCheckLimit: 0,
      websiteLimit: 0,
      pageLimit: 0,
      mxDetectionEnabled: false,
      inboxCheckEnabled: false,
    },
    {
      plan: "BASIC",
      requestLimit: 1000,
      mxDetectLimit: 100,
      inboxCheckLimit: 0,
      websiteLimit: 1,
      pageLimit: 10,
      mxDetectionEnabled: true,
      inboxCheckEnabled: false,
    },
    {
      plan: "PRO",
      requestLimit: 10000,
      mxDetectLimit: 0,
      inboxCheckLimit: 0,
      websiteLimit: 10,
      pageLimit: 100,
      mxDetectionEnabled: true,
      inboxCheckEnabled: true,
    },
  ]);

  const adminHash = await hashPassword("admin123");
  const adminApiKey = generateApiKey();
  await db.insert(usersTable).values({
    name: "Admin",
    email: "admin@tempshield.io",
    password: adminHash,
    apiKey: adminApiKey,
    role: "ADMIN",
    plan: "PRO",
  });

  await db.insert(domainsTable).values([
    { domain: "mailinator.com", source: "test" },
    { domain: "guerrillamail.com", source: "test" },
    { domain: "tempmail.com", source: "test" },
  ]);

  await loadDomainCache();
});

afterAll(async () => {
  await pool.end();
});
