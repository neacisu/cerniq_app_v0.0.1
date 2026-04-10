/**
 * Paritate `navigation.ts` ↔ `App.tsx`: fiecare rută protejată e în meniu sau în lista orphan intenționat.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getIntentionalOrphanPathSet,
  getNavigationPathSet,
} from "@/config/navigation-app-parity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appTsxPath = path.join(__dirname, "../../src/App.tsx");
const protectedRoutesPath = path.join(__dirname, "../../src/routing/protected-layout-routes.tsx");

function loadAppRoutingSource(): string {
  return `${readFileSync(appTsxPath, "utf-8")}\n${readFileSync(protectedRoutesPath, "utf-8")}`;
}

function extractRoutePathsFromAppSource(src: string): string[] {
  const paths: string[] = [];
  const re = /path="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const p = m[1];
    if (p !== undefined) paths.push(p);
  }
  return paths;
}

describe("navigation ↔ App.tsx parity", () => {
  it("fiecare rută protejată din App este în meniu sau în INTENTIONAL_MENU_ORPHAN_ROUTES", () => {
    const src = loadAppRoutingSource();
    const paths = extractRoutePathsFromAppSource(src);
    const skip = new Set(["/login", "/forgot-password", "*"]);
    const protectedPaths = paths.filter((p) => !skip.has(p));

    const nav = getNavigationPathSet();
    const orphans = getIntentionalOrphanPathSet();

    for (const p of protectedPaths) {
      const ok = nav.has(p) || orphans.has(p);
      expect(
        ok,
        `Ruta neacoperită: "${p}" — adaugă în navigation sau în navigation-app-parity.ts`,
      ).toBe(true);
    }
  });

  it("fiecare path din navigation apare ca path= în App.tsx", () => {
    const src = loadAppRoutingSource();
    const nav = getNavigationPathSet();
    for (const p of nav) {
      expect(
        src.includes(`path="${p}"`),
        `Meniu referă "${p}" dar App.tsx nu conține path="${p}"`,
      ).toBe(true);
    }
  });

  it("alias E2: rutele scurte /leads … /review există lângă /outreach/*", () => {
    const src = loadAppRoutingSource();
    for (const shortPath of ["/leads", "/sequences", "/templates", "/phones", "/review"]) {
      expect(src).toContain(`path="${shortPath}"`);
    }
    expect(src).toContain(`path="/outreach/leads"`);
  });

  it("alias import: /import și /imports indică același ecran Import", () => {
    const src = loadAppRoutingSource();
    expect(src).toContain(`path="/import"`);
    expect(src).toContain(`path="/imports"`);
  });
});
