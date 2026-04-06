/**
 * Contract: dependabot.yml — ecosisteme așteptate și fără docker la rădăcină fără Dockerfile.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe(".github/dependabot.yml", () => {
  it("declară github-actions, npm, docker (per-director) și pip pentru serviciile python cu requirements.txt", () => {
    const raw = readFileSync(path.join(ROOT, ".github/dependabot.yml"), "utf-8");
    const doc = parse(raw) as {
      version: number;
      updates: Array<{ "package-ecosystem": string; directory: string }>;
    };
    expect(doc.version).toBe(2);
    const updates = doc.updates ?? [];
    const ecosystems = updates.map((u) => u["package-ecosystem"]);
    expect(ecosystems).toContain("github-actions");
    expect(ecosystems).toContain("npm");
    expect(ecosystems.filter((e) => e === "docker").length).toBeGreaterThanOrEqual(1);
    expect(ecosystems.filter((e) => e === "pip").length).toBe(4);

    const dockerDirs = updates
      .filter((u) => u["package-ecosystem"] === "docker")
      .map((u) => u.directory);
    expect(dockerDirs).toContain("/apps/api");
    expect(dockerDirs).not.toContain("/");

    const pipDirs = updates
      .filter((u) => u["package-ecosystem"] === "pip")
      .map((u) => u.directory)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    expect(pipDirs).toEqual([
      "/services/python-document",
      "/services/python-graph",
      "/services/python-mcp",
      "/services/python-pdf",
    ]);
  });
});
