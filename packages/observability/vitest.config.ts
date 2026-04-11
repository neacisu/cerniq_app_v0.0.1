import { defineConfig } from "vitest/config";

/** Suprafața măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json` (@cerniq/observability). Modulele OTLP/buffer/logger rămân în afara pragului Vitest; acoperire incrementală și smoke. */
const coverageInclude = ["src/correlation.ts", "src/structured-logs.ts", "src/tracing.ts"];

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
