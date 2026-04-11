import { defineConfig } from "vitest/config";

/** Suprafața măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Provideri HTTP: teste cu mock + aserțiuni; prag strict pe modulul de tipuri Resend. */
const coverageInclude = ["src/resend/types.ts"];

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
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
