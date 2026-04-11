import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      /** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. */
      include: ["src/lib/phone-last4.ts", "src/lib/outreach-job-logger.ts"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
