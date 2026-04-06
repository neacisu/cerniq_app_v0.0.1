/**
 * CI nu trebuie să refere explicit exemplul UI din docs (UI_UX_Example) — SPA-ul de prod este apps/web.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORKFLOWS = path.join(ROOT, ".github", "workflows");

describe("GitHub Actions workflows — fără referință UI_UX_Example", () => {
  it("niciun fișier .yml din .github/workflows nu conține stringul UI_UX_Example", () => {
    const names = readdirSync(WORKFLOWS).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    for (const name of names) {
      const content = readFileSync(path.join(WORKFLOWS, name), "utf-8");
      expect(content, name).not.toMatch(/UI_UX_Example/i);
    }
  });
});
