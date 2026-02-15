import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import YAML from "yaml";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

function readFile(filePath: string): string {
  const fullPath = path.join(WORKSPACE_ROOT, filePath);
  return fs.readFileSync(fullPath, "utf-8");
}

describe("E0-S5-PR03: Orchestrator YAML and resource limits", () => {
  it("has orchestrator Traefik dynamic config for Cerniq", () => {
    const content = readFile("infra/config/traefik-orchestrator/cerniq.yml");
    const parsed = YAML.parse(content) as any;

    expect(parsed).toBeTruthy();
    expect(parsed.http).toBeTruthy();
    expect(parsed.http.routers).toBeTruthy();
    expect(parsed.http.services).toBeTruthy();

    // Minimal structural invariants
    expect(Object.keys(parsed.http.routers).length).toBeGreaterThan(0);
    expect(Object.keys(parsed.http.services).length).toBeGreaterThan(0);

    // Ensure Cerniq host rules exist somewhere in routers
    const routerRules = Object.values(parsed.http.routers).map((r: any) =>
      String(r?.rule || ""),
    );
    expect(routerRules.join("\n")).toContain("Host(`cerniq.app`)");
    expect(routerRules.join("\n")).toContain("Host(`staging.cerniq.app`)");
  });

  it("keeps production compose limits under 32GB RAM", () => {
    const content = readFile("infra/docker/docker-compose.prod.yml");
    const memoryMatches = content.match(/memory:\s*([0-9]+)([MG])/g) || [];

    let totalMb = 0;
    for (const match of memoryMatches) {
      const value = Number(match.match(/([0-9]+)/)?.[1] || 0);
      const unit = match.match(/([MG])/)?.[1] || "M";
      totalMb += unit === "G" ? value * 1024 : value;
    }

    expect(totalMb).toBeLessThanOrEqual(32 * 1024);
  });
});
