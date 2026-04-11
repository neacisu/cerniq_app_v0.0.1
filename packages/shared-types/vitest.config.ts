import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "__tests__/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      /**
       * Vitest 4+ (`CoverageOptions`): nu există `all`; `include` stabilește globs-urile din raportul de acoperire
       * pentru tot codul sursă `.ts` din `src/` (inclusiv fișiere care nu sunt încărcate direct de teste).
       */
      include: ["src/**/*.ts"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.test.ts", "**/*.d.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
