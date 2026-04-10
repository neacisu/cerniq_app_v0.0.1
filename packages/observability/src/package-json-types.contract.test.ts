import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Consumatorii workspace (`@cerniq/integrations`, `@cerniq/worker-shared`, …) rezolvă
 * `@cerniq/observability` prin `node_modules` + package.json. Dacă `types` indică doar
 * `dist/*.d.ts` fără `dist/` generat, TS2307 apare în IDE și la `tsc --noEmit`.
 * Aliniere la `@cerniq/db`: tipuri din sursă, runtime din `dist` după build.
 */
describe("@cerniq/observability package.json (types consumabile fără dist)", () => {
  it("types și exports['.'].types indică src/index.ts", () => {
    const srcDir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(srcDir, "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      types?: string;
      exports?: Record<string, { types?: string }>;
    };
    expect(pkg.types?.replace(/^\.\//, "")).toBe("src/index.ts");
    expect(pkg.exports?.["."]?.types?.replace(/^\.\//, "")).toBe("src/index.ts");
  });
});
