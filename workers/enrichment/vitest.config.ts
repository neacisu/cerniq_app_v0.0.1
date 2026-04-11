import { defineConfig } from "vitest/config";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Procesori `src/workers/**`: BullMQ + integrare. */
const coverageInclude = [
  "src/lib/execution-correlation.ts",
  "src/lib/job-logger.ts",
  "src/lib/phone-last4.ts",
  "src/lib/worker-metrics.ts",
];

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: coverageInclude,
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
