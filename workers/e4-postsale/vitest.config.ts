import { defineConfig } from "vitest/config";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Restul workerilor E4: suite fără prag sau integrare. */
const coverageInclude = [
  "src/e4-metrics.ts",
  "src/lib/audit-chain.ts",
  "src/workers/a5-revolut-balance-sync.ts",
  "src/workers/a6-revolut-webhook-validate.ts",
  "src/workers/b8-payment-reconcile-fuzzy.ts",
  "src/workers/c14-credit-data-fetch-anaf.ts",
  "src/workers/c15-credit-data-fetch-bilant.ts",
  "src/workers/c16-credit-data-fetch-bpi.ts",
  "src/workers/c18-credit-limit-calculate.ts",
  "src/workers/credit-refresh-all.ts",
  "src/workers/g36-contract-signed-process.ts",
  "src/workers/i-alert-workers.ts",
  "src/workers/reservation-expire.ts",
];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/__tests__/**/*.test.ts"],
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
