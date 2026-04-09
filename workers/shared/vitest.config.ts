import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      /** Bibliotecă mare (registry, redis, factory); praguri anti-regresie — vezi roadmap creștere la 75%+. */
      thresholds: {
        statements: 52,
        branches: 35,
        functions: 48,
        lines: 54,
      },
    },
  },
});
