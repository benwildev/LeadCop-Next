import { defineConfig } from "vitest/config";

function resolveTestDbUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const base = process.env.DATABASE_URL;
  if (base) {
    return base.replace(/\/([^/?]+)(\?|$)/, (_: string, name: string, rest: string) =>
      `/${name}_test${rest}`
    );
  }

  throw new Error(
    "Neither TEST_DATABASE_URL nor DATABASE_URL is set.\n" +
    "Set TEST_DATABASE_URL to a dedicated test database URL to keep dev data safe.\n" +
    "Example: TEST_DATABASE_URL=postgresql://user:pass@host/tempshield_test?sslmode=disable"
  );
}

const testDbUrl = resolveTestDbUrl();

const dbName = new URL(testDbUrl.replace(/\?.*$/, "")).pathname.slice(1);
if (!dbName.endsWith("_test")) {
  throw new Error(
    `Test database name must end with '_test' to prevent accidental data loss.\n` +
    `Resolved database name: "${dbName}"\n` +
    `Please point TEST_DATABASE_URL to a dedicated test database (e.g. tempshield_test).`
  );
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    fileParallelism: false,
    env: {
      DATABASE_URL: testDbUrl,
    },
  },
  resolve: {
    conditions: ["workspace"],
  },
});
