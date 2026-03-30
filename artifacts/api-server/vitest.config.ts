import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/tests/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "",
    },
  },
  resolve: {
    conditions: ["workspace"],
  },
});
