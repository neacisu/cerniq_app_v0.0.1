import { defineConfig } from "vitest/config";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Restul E3: suite extinse fără prag global pe acel fișier. */
const coverageInclude = [
  "src/e3-metrics.ts",
  "src/lib/mcp-server.ts",
  "src/workers/a1-product-ingest.ts",
  "src/workers/a6-product-variant-process.ts",
  "src/workers/c18-ai-retry-regenerate.ts",
  "src/workers/d20-negotiation-history-log.ts",
  "src/workers/d23-negotiation-expire-check.ts",
  "src/workers/d24-negotiation-close-execute.ts",
  "src/workers/e30-pricing-margin-check.ts",
  "src/workers/e32-pricing-competitor-check.ts",
  "src/workers/j56-handover-detect.ts",
  "src/workers/j59-channel-whatsapp-send.ts",
  "src/workers/k62-intent-classify.ts",
  "src/workers/k63-objection-detect.ts",
  "src/workers/k65-feedback-collect.ts",
  "src/workers/l67-mcp-tool-register.ts",
  "src/workers/n77-human-takeover.ts",
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
