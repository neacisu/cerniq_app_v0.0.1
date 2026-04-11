import { defineConfig } from "vitest/config";
import path from "node:path";

/** Suprafața Tier B măsurată — vezi `docs/developer-guide/testing-coverage-tiers.json`. Rutele și serviciile voluminoase: supertest + integrare; prag Vitest pe modulele enumerate. */
const coverageInclude = [
  "src/errors/app-error.ts",
  "src/lib/http-job-tracing.ts",
  "src/routes/index.ts",
  "src/schemas/etapa1.ts",
];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: coverageInclude,
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
