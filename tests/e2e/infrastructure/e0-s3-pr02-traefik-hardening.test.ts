/**
 * E0-S3-PR02: Ingress Migration Validation
 * =======================================
 * Internal Traefik/staging-proxy were removed.
 * Public ingress is now provided by orchestrator Traefik.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(WORKSPACE_ROOT, filePath));
}

function readFile(filePath: string): string {
  const fullPath = path.join(WORKSPACE_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

describe("E0-S3-PR02: Centralized ingress model", () => {
  it("removes internal Traefik service from docker-compose", () => {
    const compose = readFile("infra/docker/docker-compose.yml");
    expect(compose).not.toMatch(/\n\s{2}traefik:\n/);
    expect(compose).not.toContain("traefik_certs");
  });

  it("removes internal staging-proxy service from docker-compose", () => {
    const compose = readFile("infra/docker/docker-compose.yml");
    expect(compose).not.toMatch(/\n\s{2}staging-proxy:\n/);
  });

  it("removes deprecated internal ingress files", () => {
    expect(fileExists("infra/docker/traefik/traefik.yml")).toBe(false);
    expect(fileExists("infra/docker/traefik/dynamic/middlewares.yml")).toBe(
      false,
    );
    expect(fileExists("infra/docker/nginx/staging-proxy.conf")).toBe(false);
  });

  it("uses ingress checks in deployment workflow", () => {
    const workflow = readFile(".github/workflows/deploy.yml");
    expect(workflow).toContain("https://staging.cerniq.app");
    expect(workflow).toContain("https://cerniq.app");
    expect(workflow).not.toContain("64093/ping");
  });

  it("keeps external domain routing documented", () => {
    const dns = readFile("docs/infrastructure/dns-configuration.md");
    expect(dns).toMatch(/cerniq\.app/);
    expect(dns).toMatch(/staging\.cerniq\.app/);
    expect(dns).toMatch(/api\.cerniq\.app/);
  });
});
