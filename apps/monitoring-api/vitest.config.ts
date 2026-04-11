import { defineConfig } from "vitest/config";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json` (@cerniq/monitoring-api). App Fastify + auth + cozi: integrare / supertest; prag Vitest pe modulul pur `system-metrics`. */
const coverageInclude = ["src/system-metrics.ts"];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      include: coverageInclude,
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
