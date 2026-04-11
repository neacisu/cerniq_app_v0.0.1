import { defineConfig } from "vitest/config";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json` (@cerniq/worker-shared). Registry/LLM/factory rămân în afara pragului Vitest până la suite extinse sau integrare Redis. */
const coverageInclude = [
  "src/event-contract.ts",
  "src/external-api-wrapper.ts",
  "src/worker-auto-obs-env.ts",
  "src/worker-cognitive-env.ts",
];

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
