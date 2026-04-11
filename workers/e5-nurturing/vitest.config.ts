import { defineConfig } from "vitest/config";

/** Suprafața măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Alte module (Leiden, FSM): teste fără prag linii sau integrare. */
const coverageInclude = ["src/lib/e5-metrics.ts"];

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
