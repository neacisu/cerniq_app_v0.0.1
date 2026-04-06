/**
 * Paritate infra: porturi publicate în range ADR-0022, servicii cheie,
 * `VITE_API_PROXY_TARGET` în dev folosește hostname-ul serviciului Compose (DNS), nu container_name.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";
import { describe, expect, it } from "vitest";
import { CERNIQ_APP_SERVICE_PORTS } from "../../packages/config/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");
const DOCKER_DIR = path.join(ROOT, "infra", "docker");

function hostPortsFromMapping(entry: unknown): number[] {
  if (typeof entry === "string") {
    const host = entry.trim().split(":")[0]?.replace(/^\[/, "") ?? "";
    const n = Number(host);
    return Number.isFinite(n) ? [n] : [];
  }
  if (entry && typeof entry === "object" && "published" in entry) {
    const p = (entry as { published: string | number }).published;
    const n = typeof p === "number" ? p : Number(String(p).split("/")[0]);
    return Number.isFinite(n) ? [n] : [];
  }
  return [];
}

function collectHostPorts(ports: unknown): number[] {
  if (!ports) return [];
  if (!Array.isArray(ports)) return [];
  return ports.flatMap(hostPortsFromMapping);
}

describe("infra/docker — paritate porturi și Vite proxy (ADR-0022 / etapa0-port-matrix)", () => {
  it("docker-compose.yml — porturi host în 64000–64099 pentru mapări expuse", () => {
    const raw = readFileSync(path.join(DOCKER_DIR, "docker-compose.yml"), "utf8");
    const doc = parseDocument(raw);
    const root = doc.toJSON() as {
      services?: Record<string, { ports?: unknown }>;
    };
    expect(root.services).toBeTruthy();
    if (!root.services) throw new Error("docker-compose.yml: lipsește `services`");
    const services = root.services;
    for (const [name, cfg] of Object.entries(services)) {
      const hosts = collectHostPorts(cfg?.ports);
      for (const h of hosts) {
        expect(h, `serviciu ${name}: port host ${h}`).toBeGreaterThanOrEqual(64000);
        expect(h, `serviciu ${name}: port host ${h}`).toBeLessThanOrEqual(64099);
      }
    }
  });

  it("docker-compose.yml — servicii aplicație pe porturile canonice din @cerniq/config", () => {
    const raw = readFileSync(path.join(DOCKER_DIR, "docker-compose.yml"), "utf8");
    const doc = parseDocument(raw);
    const root = doc.toJSON() as {
      services?: Record<string, { ports?: unknown }>;
    };
    if (!root.services) throw new Error("docker-compose.yml: lipsește `services`");
    const s = root.services;
    expect(collectHostPorts(s["cerniq-web"]?.ports)).toContain(CERNIQ_APP_SERVICE_PORTS.web);
    expect(collectHostPorts(s["cerniq-api"]?.ports)).toContain(CERNIQ_APP_SERVICE_PORTS.api);
    expect(collectHostPorts(s["cerniq-admin"]?.ports)).toContain(CERNIQ_APP_SERVICE_PORTS.webAdmin);
    expect(collectHostPorts(s["cerniq-monitoring-api"]?.ports)).toContain(
      CERNIQ_APP_SERVICE_PORTS.monitoringApi,
    );
  });

  it("docker-compose.dev.yml — VITE_API_PROXY_TARGET indică serviciul cerniq-api (rezolvare DNS Compose)", () => {
    const raw = readFileSync(path.join(DOCKER_DIR, "docker-compose.dev.yml"), "utf8");
    const doc = parseDocument(raw);
    const root = doc.toJSON() as {
      services?: Record<string, { environment?: Record<string, string> }>;
    };
    const web = root.services?.["cerniq-web"]?.environment;
    const admin = root.services?.["cerniq-admin"]?.environment;
    expect(web?.VITE_API_PROXY_TARGET).toBe(`http://cerniq-api:${CERNIQ_APP_SERVICE_PORTS.api}`);
    expect(admin?.VITE_API_PROXY_TARGET).toBe(`http://cerniq-api:${CERNIQ_APP_SERVICE_PORTS.api}`);
  });
});
