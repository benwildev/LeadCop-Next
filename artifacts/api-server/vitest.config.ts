import { defineConfig } from "vitest/config";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL must be set to run tests.\n" +
    "Point it to a dedicated test database (e.g. tempshield_test) to keep dev data safe.\n" +
    "Example: TEST_DATABASE_URL=postgresql://user:pass@host/tempshield_test?sslmode=disable"
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
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  },
  resolve: {
    conditions: ["workspace"],
  },
});
