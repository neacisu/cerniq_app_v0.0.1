import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/ensure-job-data-correlation.ts",
        "src/lib/phone-last4.ts",
        "src/lib/outreach-job-logger.ts",
        "src/lib/sms-job-failure-log.ts",
      ],
      exclude: ["**/node_modules/**", "**/dist/**"],
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
