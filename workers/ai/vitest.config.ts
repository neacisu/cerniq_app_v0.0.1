import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/main.ts"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      /** Worker health-only: bootstrap nu e apelat în test (fără Redis); păstrăm prag minim anti-regresie. */
      thresholds: {
        statements: 5,
        branches: 90,
        functions: 0,
        lines: 5,
      },
    },
  },
});
