import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      /** Praguri anti-regresie pe tot `src/` (~48% linii); Sonar + teste integrare urmăresc calitatea. */
      thresholds: { statements: 45, branches: 24, functions: 48, lines: 48 },
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
