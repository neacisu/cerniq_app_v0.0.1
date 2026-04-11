import { defineConfig } from "vitest/config";

/**
 * Tier B (@cerniq/db): prag 100% pe codul sursă din `src/` în afara bootstrap și a schemelor masive.
 * `client.ts` / `migrate.ts` rămân în afara pragului unitar (integrare + `test:integration`).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      /** Vitest 4+: opțiunea `all` nu mai există în CoverageOptions; se folosește `include` (același glob ca mai jos). */
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/node_modules/**",
        "**/dist/**",
        "src/schemas/**",
        "src/client.ts",
        "src/migrate.ts",
        "src/migrate-cli.ts",
        "src/seed.ts",
        "src/migrate-openbao.ts",
        "src/migration-sql-audit.ts",
        "src/index.ts",
        "src/helpers/**",
        "src/services/**",
        "src/test-utils/**",
      ],
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
