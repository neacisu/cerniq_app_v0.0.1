/**
 * Coverage pentru codul producție din `apps/web/src` (E1–E5, Cognitive, dashboard, hooks, lib, etc.).
 *
 * Baseline măsurat (Vitest v8, fără *.stories): ~74% statements / ~77% lines — import.tsx și rutele lazy rămân costisitoare; vezi __tests__/coverage/*.coverage.test.tsx.
 * Praguri aici sunt 0 pentru a nu bloca CI; folosiți `pnpm test:coverage:ui-missing-e1-e2` pentru prag 100% pe
 * cele 6 componente task dedicat.
 *
 * Pentru a urca spre 100% global: adăugați teste RTL/integration pe pagini și pe `providers/`, `routing/`,
 * și extindeți scenariile MSW existente — nu există scurtătură sigură fără sute/mii de aserțiuni noi.
 */
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config.js";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        reportsDirectory: "./coverage-app",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "**/*.stories.{ts,tsx}",
          "**/*.stories.tsx",
          "src/stories/**",
          "src/test-utils/**",
          "src/lib/storybook-auth-seed.ts",
          "src/config/navigation-app-parity.ts",
        ],
        /** Raport informativ; prag 0 = nu eșuează CI până când echipa ridică țintele incremental. */
        thresholds: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
        },
        watermarks: {
          statements: [50, 95],
          branches: [50, 90],
          functions: [50, 95],
          lines: [50, 95],
        },
      },
    },
  }),
);
