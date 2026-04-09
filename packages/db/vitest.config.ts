import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      /** Scheme Drizzle = definiții declarative; pragul se aplică pe logică (client, servicii, helpers). */
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "src/schemas/**",
        "src/migrate.ts",
        "src/migrate-cli.ts",
        "src/seed.ts",
        "src/migrate-openbao.ts",
        /** Bootstrap conexiune — acoperit indirect prin teste de integrare / CI. */
        "src/client.ts",
        "drizzle/**",
      ],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
