/**
 * Guard plan `packages-db-shared-integrations-schema`: pachetele de date partajate
 * expun `typecheck` în package.json (sursă verificabilă în CI).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

const PACKAGES: { name: string; rel: string }[] = [
  { name: "@cerniq/db", rel: "packages/db/package.json" },
  { name: "@cerniq/shared-types", rel: "packages/shared-types/package.json" },
  { name: "@cerniq/shared", rel: "packages/shared/package.json" },
  { name: "@cerniq/integrations", rel: "packages/integrations/package.json" },
  { name: "@cerniq/config", rel: "packages/config/package.json" },
  { name: "@cerniq/observability", rel: "packages/observability/package.json" },
];

describe("monorepo packages — script typecheck (schema sync guard)", () => {
  for (const { name, rel } of PACKAGES) {
    it(`${name} are script "typecheck" în package.json`, () => {
      const raw = readFileSync(path.join(ROOT, rel), "utf8");
      const pkg: unknown = JSON.parse(raw);
      expect(pkg).toEqual(
        expect.objectContaining({
          scripts: expect.objectContaining({
            typecheck: expect.stringMatching(/./),
          }),
        }),
      );
    });
  }
});
