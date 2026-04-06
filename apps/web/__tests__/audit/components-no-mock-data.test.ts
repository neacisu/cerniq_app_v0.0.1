/**
 * Audit plan `web-shared-components-data-audit`: sub `src/components/` nu există prefix `MOCK_`
 * (date business inventate). Parcurgere la runtime — la adăugare MOCK_ testul pică.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENTS_ROOT = path.join(__dirname, "../../src/components");

const MOCK_PATTERN = /\bMOCK_\w+\b/;

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "__tests__" || ent.name === "node_modules") continue;
      walkTsFiles(full, out);
    } else if (ent.isFile() && (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts"))) {
      out.push(full);
    }
  }
  return out;
}

describe("components/ — fără MOCK_* (date business fictive)", () => {
  it("toate fișierele .ts/.tsx sub src/components trec scanarea", () => {
    expect(statSync(COMPONENTS_ROOT).isDirectory()).toBe(true);
    const files = walkTsFiles(COMPONENTS_ROOT);
    expect(files.length).toBeGreaterThan(10);
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (MOCK_PATTERN.test(src)) offenders.push(path.relative(COMPONENTS_ROOT, file));
    }
    expect(offenders, `Fișiere cu MOCK_: ${offenders.join(", ")}`).toEqual([]);
  });
});
