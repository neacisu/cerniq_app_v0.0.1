/**
 * Regresie CI: `tsc --noEmit` pe pachetele unde IDE-ul raportează TS2344 / TS7016 / TS2307
 * (shim-uri `src/*` → `packages/observability` / `apps/api`).
 */
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "vitest";

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function tscNoEmit(relConfig: string): void {
  execFileSync("pnpm", ["exec", "tsc", "--noEmit", "-p", relConfig], {
    cwd: monorepoRoot,
    stdio: "pipe",
    encoding: "utf8",
  });
}

describe("tsc --noEmit (db, observability, apps/api, src shims)", () => {
  it("packages/db/tsconfig.json", () => {
    tscNoEmit("packages/db/tsconfig.json");
  });

  it("packages/observability/tsconfig.json", () => {
    tscNoEmit("packages/observability/tsconfig.json");
  });

  it("apps/api/tsconfig.json", () => {
    tscNoEmit("apps/api/tsconfig.json");
  });

  it("tsconfig.json (rădăcină — singurul proiect TS pentru src/ shim-uri; evită proiect duplicat în IDE)", () => {
    tscNoEmit("tsconfig.json");
  });
});
