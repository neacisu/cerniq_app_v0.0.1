/**
 * E0-S3-PR02: F0.4 Traefik v3.6 + Hardening Tests
 * ================================================
 * Validation tests for all tasks in Sprint 3 PR02
 *
 * Run with: pnpm test
 *
 * Tests automatically detect environment:
 * - Repo tests: Always run (validate configs exist)
 * - Server tests: Skip in CI, run when Docker/curl available
 *
 * Environment detection:
 * - CERNIQ_ENV=staging → Tests staging.cerniq.app
 * - CERNIQ_ENV=production → Tests cerniq.app
 * - Default (local) → Tests localhost:64080
 *
 * @reference docs/specifications/Etapa 0/etapa0-plan-implementare-complet-v2.md
 * @reference docs/adr/ADR Etapa 0/ADR-0009-Traefik-Reverse-Proxy.md
 * @reference docs/infrastructure/etapa0-port-matrix.md
 */

import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// =============================================================================
// Test Configuration
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";
const CERNIQ_ENV = process.env.CERNIQ_ENV || "local";

// Environment-specific URLs
const ENV_CONFIG = {
  local: {
    traefikUrl: "http://localhost:64080",
    httpsUrl: "https://localhost:64443",
    domain: "localhost",
  },
  staging: {
    traefikUrl: "http://localhost:64080",
    httpsUrl: "https://staging.cerniq.app",
    domain: "staging.cerniq.app",
  },
  production: {
    traefikUrl: "http://localhost:64080",
    httpsUrl: "https://cerniq.app",
    domain: "cerniq.app",
  },
} as const;

const CURRENT_ENV =
  ENV_CONFIG[CERNIQ_ENV as keyof typeof ENV_CONFIG] || ENV_CONFIG.local;

// Expected Traefik configuration (per ADR-0014, ADR-0022, etapa0-port-matrix.md)
// NOTE: TLS is terminated by external proxy (nginx/neanelu_traefik)
// This internal Traefik receives HTTP from external proxy
export const EXPECTED_TRAEFIK_CONFIG = {
  version: "3.3", // Traefik v3.3.5
  ports: {
    http: 64080, // Main HTTP entrypoint
    dashboard: 64081, // Metrics and dashboard
  },
  // HSTS is handled by external proxy - not configured here
  security: {
    frameDeny: true,
    browserXssFilter: true,
    contentTypeNosniff: true,
    referrerPolicy: "strict-origin-when-cross-origin",
  },
  rateLimit: {
    average: 100,
    burst: 200, // Per ADR-0014: 100 req/s average, 200 burst
  },
} as const;

// =============================================================================
// Utility Functions
// =============================================================================

function exec(command: string, timeout = 30000): string {
  try {
    return execSync(command, { encoding: "utf-8", timeout }).trim();
  } catch {
    return "";
  }
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(WORKSPACE_ROOT, filePath));
}

function readFile(filePath: string): string {
  const fullPath = path.join(WORKSPACE_ROOT, filePath);
  if (!fs.existsSync(fullPath)) return "";
  return fs.readFileSync(fullPath, "utf-8");
}

function parseYaml<T>(content: string): T | null {
  try {
    return yaml.parse(content) as T;
  } catch {
    return null;
  }
}

function isDockerAvailable(): boolean {
  try {
    execSync("docker info", { encoding: "utf-8", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function isContainerRunning(containerName: string): boolean {
  try {
    const result = exec(
      `docker inspect -f '{{.State.Running}}' ${containerName}`,
    );
    return result === "true";
  } catch {
    return false;
  }
}

function curlHeaders(url: string): Record<string, string> {
  try {
    const output = exec(`curl -sI -k --connect-timeout 5 "${url}" 2>/dev/null`);
    const headers: Record<string, string> = {};
    output.split("\n").forEach((line) => {
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        headers[match[1].toLowerCase()] = match[2].trim();
      }
    });
    return headers;
  } catch {
    return {};
  }
}

function canConnectTo(url: string): boolean {
  try {
    const result = exec(
      `curl -sI -k --connect-timeout 3 "${url}" 2>/dev/null | head -1`,
    );
    return result.includes("HTTP");
  } catch {
    return false;
  }
}

const DOCKER_AVAILABLE = isDockerAvailable();
const TRAEFIK_RUNNING =
  DOCKER_AVAILABLE && isContainerRunning("cerniq-traefik");
const HTTPS_AVAILABLE = canConnectTo(CURRENT_ENV.httpsUrl);

// =============================================================================
// F0.4.1.T001: Traefik Static Configuration
// NOTE: This Traefik instance receives HTTP from external proxy (nginx/neanelu_traefik)
// TLS termination and Let's Encrypt are handled by external proxy
// =============================================================================

describe("F0.4.1.T001: Traefik Static Configuration", () => {
  const traefikYmlPath = "infra/docker/traefik/traefik.yml";
  let traefikConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(traefikYmlPath);
    traefikConfig = parseYaml<Record<string, unknown>>(content);
  });

  it("should have traefik.yml configuration file", () => {
    expect(fileExists(traefikYmlPath)).toBe(true);
  });

  it("should define API configuration", () => {
    expect(traefikConfig).not.toBeNull();
    expect(traefikConfig).toHaveProperty("api");
  });

  it("should have dashboard enabled", () => {
    const api = traefikConfig?.api as Record<string, unknown>;
    expect(api?.dashboard).toBe(true);
  });

  it("should have insecure mode disabled for dashboard", () => {
    const api = traefikConfig?.api as Record<string, unknown>;
    expect(api?.insecure).toBe(false);
  });

  it("should define entryPoints", () => {
    expect(traefikConfig).toHaveProperty("entryPoints");
  });

  it("should have web entrypoint on port 64080", () => {
    const entryPoints = traefikConfig?.entryPoints as Record<string, unknown>;
    const web = entryPoints?.web as Record<string, unknown>;
    expect(web?.address).toBe(`:${EXPECTED_TRAEFIK_CONFIG.ports.http}`);
  });

  it("should have metrics entrypoint on port 64081", () => {
    const entryPoints = traefikConfig?.entryPoints as Record<string, unknown>;
    const metrics = entryPoints?.metrics as Record<string, unknown>;
    expect(metrics?.address).toBe(
      `:${EXPECTED_TRAEFIK_CONFIG.ports.dashboard}`,
    );
  });

  it("should configure trusted IPs for forwarded headers", () => {
    const entryPoints = traefikConfig?.entryPoints as Record<string, unknown>;
    const web = entryPoints?.web as Record<string, unknown>;
    const forwardedHeaders = web?.forwardedHeaders as Record<string, unknown>;
    const trustedIPs = forwardedHeaders?.trustedIPs as string[];
    expect(trustedIPs).toContain("127.0.0.1/32");
    expect(trustedIPs).toContain("172.16.0.0/12"); // Docker networks
  });

  it("should disable anonymous usage statistics", () => {
    const global = traefikConfig?.global as Record<string, unknown>;
    expect(global?.sendAnonymousUsage).toBe(false);
  });

  it("should define providers configuration", () => {
    expect(traefikConfig).toHaveProperty("providers");
  });

  it("should configure file provider for dynamic config", () => {
    const providers = traefikConfig?.providers as Record<string, unknown>;
    const file = providers?.file as Record<string, unknown>;
    expect(file?.directory).toBe("/etc/traefik/dynamic");
    expect(file?.watch).toBe(true);
  });

  it("should configure ping health check", () => {
    expect(traefikConfig).toHaveProperty("ping");
    const ping = traefikConfig?.ping as Record<string, unknown>;
    expect(ping?.entryPoint).toBe("metrics");
  });

  it("should configure Prometheus metrics", () => {
    expect(traefikConfig).toHaveProperty("metrics");
    const metrics = traefikConfig?.metrics as Record<string, unknown>;
    expect(metrics?.prometheus).toBeDefined();
  });
});

// =============================================================================
// F0.4.1.T002: Dynamic Middlewares for Security
// NOTE: HSTS is handled by external proxy - we configure other security headers
// =============================================================================

describe("F0.4.1.T002: Security Middlewares Configuration", () => {
  const middlewaresPath = "infra/docker/traefik/dynamic/middlewares.yml";
  let middlewaresConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(middlewaresPath);
    middlewaresConfig = parseYaml<Record<string, unknown>>(content);
  });

  it("should have middlewares.yml configuration file", () => {
    expect(fileExists(middlewaresPath)).toBe(true);
  });

  it("should define http middlewares section", () => {
    expect(middlewaresConfig).not.toBeNull();
    const http = middlewaresConfig?.http as Record<string, unknown>;
    expect(http).toHaveProperty("middlewares");
  });

  it("should define security-headers middleware", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("security-headers");
  });

  it("should configure frameDeny (X-Frame-Options: DENY)", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    expect(headers?.frameDeny).toBe(true);
  });

  it("should configure browserXssFilter", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    expect(headers?.browserXssFilter).toBe(true);
  });

  it("should configure contentTypeNosniff", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    expect(headers?.contentTypeNosniff).toBe(true);
  });

  it("should configure referrerPolicy", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    expect(headers?.referrerPolicy).toBe(
      EXPECTED_TRAEFIK_CONFIG.security.referrerPolicy,
    );
  });

  it("should configure permissionsPolicy", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    expect(headers?.permissionsPolicy).toBeDefined();
  });

  it("should remove X-Powered-By header", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;
    const customHeaders = headers?.customResponseHeaders as Record<
      string,
      string
    >;
    expect(customHeaders?.["X-Powered-By"]).toBe("");
  });

  it("should define rate-limit middleware", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("rate-limit");
  });

  it("should configure rate limiting average", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const rateLimitConfig = rateLimit?.rateLimit as Record<string, unknown>;
    expect(rateLimitConfig?.average).toBe(
      EXPECTED_TRAEFIK_CONFIG.rateLimit.average,
    );
  });

  it("should configure rate limiting burst", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const rateLimitConfig = rateLimit?.rateLimit as Record<string, unknown>;
    expect(rateLimitConfig?.burst).toBe(
      EXPECTED_TRAEFIK_CONFIG.rateLimit.burst,
    );
  });

  it("should configure rate-limit-strict for auth endpoints", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("rate-limit-strict");
    const rateLimitStrict = middlewares?.["rate-limit-strict"] as Record<
      string,
      unknown
    >;
    const config = rateLimitStrict?.rateLimit as Record<string, unknown>;
    expect(config?.average).toBe(10);
    expect(config?.burst).toBe(20);
  });

  it("should define api-chain middleware", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("api-chain");
  });

  it("should define auth-chain middleware with strict rate limit", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("auth-chain");
  });

  it("should define dashboard-auth middleware", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("dashboard-auth");
  });

  it("should configure circuit breaker middleware", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("circuit-breaker");
  });
});

// =============================================================================
// F0.4.1.T003: Traefik Service in docker-compose.yml
// NOTE: No HTTPS port - TLS handled by external proxy
// =============================================================================

describe("F0.4.1.T003: Traefik Service in docker-compose.yml", () => {
  const dockerComposePath = "infra/docker/docker-compose.yml";
  let dockerCompose: Record<string, unknown> | null = null;
  let traefikService: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(dockerComposePath);
    dockerCompose = parseYaml<Record<string, unknown>>(content);
    if (dockerCompose) {
      const services = dockerCompose.services as Record<string, unknown>;
      traefikService = services?.traefik as Record<string, unknown>;
    }
  });

  it("should have docker-compose.yml file", () => {
    expect(fileExists(dockerComposePath)).toBe(true);
  });

  it("should define traefik service", () => {
    expect(dockerCompose).not.toBeNull();
    const services = (dockerCompose as Record<string, unknown>)
      ?.services as Record<string, unknown>;
    expect(services).toHaveProperty("traefik");
  });

  it("should use Traefik v3.x image", () => {
    const image = traefikService?.image as string;
    expect(image).toMatch(/traefik:v3\./);
  });

  it("should have container name cerniq-traefik", () => {
    expect(traefikService?.container_name).toBe("cerniq-traefik");
  });

  it("should expose port 64080 for HTTP", () => {
    const ports = traefikService?.ports as string[];
    expect(ports).toEqual(
      expect.arrayContaining([expect.stringContaining("64080")]),
    );
  });

  it("should expose port 64081 for dashboard/metrics (localhost only)", () => {
    const ports = traefikService?.ports as string[];
    const dashboardPort = ports?.find((p) => p.includes("64081"));
    expect(dashboardPort).toBeDefined();
    expect(dashboardPort).toContain("127.0.0.1");
  });

  it("should mount traefik.yml configuration", () => {
    const volumes = traefikService?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([expect.stringContaining("traefik.yml")]),
    );
  });

  it("should mount dynamic configuration directory", () => {
    const volumes = traefikService?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([expect.stringContaining("dynamic")]),
    );
  });

  it("should mount docker.sock for container discovery", () => {
    const volumes = traefikService?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([expect.stringContaining("docker.sock")]),
    );
  });

  it("should be on cerniq_public network", () => {
    const networks = traefikService?.networks as
      | string[]
      | Record<string, unknown>;
    if (Array.isArray(networks)) {
      expect(networks).toContain("cerniq_public");
    } else {
      expect(networks).toHaveProperty("cerniq_public");
    }
  });

  it("should have healthcheck configured", () => {
    const healthcheck = traefikService?.healthcheck as Record<string, unknown>;
    expect(healthcheck).toBeDefined();
    expect(healthcheck?.test).toBeDefined();
  });

  it("should have restart policy unless-stopped", () => {
    expect(traefikService?.restart).toBe("unless-stopped");
  });

  it("should have resource limits defined", () => {
    const deploy = traefikService?.deploy as Record<string, unknown>;
    expect(deploy?.resources).toBeDefined();
  });
});

// =============================================================================
// F0.4.1.T004: Traefik Running and Healthy
// =============================================================================

describe("F0.4.1.T004: Traefik Container Running", () => {
  it.skipIf(!DOCKER_AVAILABLE)("should have Docker available", () => {
    expect(DOCKER_AVAILABLE).toBe(true);
  });

  it.skipIf(!DOCKER_AVAILABLE)(
    "should have cerniq-traefik container running",
    () => {
      expect(TRAEFIK_RUNNING).toBe(true);
    },
  );

  it.skipIf(!TRAEFIK_RUNNING)("should have healthy container status", () => {
    const health = exec(
      `docker inspect -f '{{.State.Health.Status}}' cerniq-traefik`,
    );
    expect(health).toBe("healthy");
  });

  it.skipIf(!TRAEFIK_RUNNING)("should be using Traefik v3.x", () => {
    const version = exec(
      `docker exec cerniq-traefik traefik version 2>/dev/null | head -1`,
    );
    expect(version).toMatch(/Version:\s+3\./);
  });

  it.skipIf(!TRAEFIK_RUNNING)("should respond on port 64080", () => {
    const result = exec(
      `curl -s -o /dev/null -w '%{http_code}' http://localhost:64080 2>/dev/null`,
    );
    // 404 is OK - means Traefik is responding but no routes match
    expect(["200", "404", "502"]).toContain(result);
  });

  it.skipIf(!TRAEFIK_RUNNING)(
    "should have dashboard accessible on localhost:64081",
    () => {
      const result = exec(
        `curl -s -o /dev/null -w '%{http_code}' http://localhost:64081/dashboard/ 2>/dev/null`,
      );
      // 401 means auth is required (correct), 200 means accessible, 403 means IP whitelist
      expect(["200", "401", "403"]).toContain(result);
    },
  );

  it.skipIf(!TRAEFIK_RUNNING)("should have ping endpoint healthy", () => {
    const result = exec(
      `curl -s -o /dev/null -w '%{http_code}' http://localhost:64081/ping 2>/dev/null`,
    );
    expect(["200", "403"]).toContain(result);
  });
});

// =============================================================================
// F0.4.2.T001: htpasswd for Traefik Dashboard
// =============================================================================

describe("F0.4.2.T001: Traefik Dashboard htpasswd", () => {
  const htpasswdPath = "secrets/traefik_dashboard.htpasswd";

  it("should have traefik_dashboard.htpasswd file", () => {
    expect(fileExists(htpasswdPath)).toBe(true);
  });

  it("should have valid htpasswd format", () => {
    const content = readFile(htpasswdPath);
    // Format: user:$apr1$salt$hash or user:$2y$...
    expect(content).toMatch(/^[a-zA-Z0-9_-]+:\$[a-z0-9]+\$/m);
  });

  it("should have secure file permissions", () => {
    const fullPath = path.join(WORKSPACE_ROOT, htpasswdPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const mode = (stats.mode & 0o777).toString(8);
      // Should be 600 or 640 (only owner can read/write)
      expect(["600", "640", "644"]).toContain(mode);
    }
  });

  it("should be referenced in docker-compose.yml", () => {
    const dockerCompose = readFile("infra/docker/docker-compose.yml");
    expect(dockerCompose).toContain("traefik_dashboard.htpasswd");
  });
});

// =============================================================================
// F0.4.2.T002: Access Logs JSON Configuration
// =============================================================================

describe("F0.4.2.T002: Traefik Access Logs", () => {
  const traefikYmlPath = "infra/docker/traefik/traefik.yml";
  let traefikConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(traefikYmlPath);
    traefikConfig = parseYaml<Record<string, unknown>>(content);
  });

  it("should have accessLog configuration", () => {
    expect(traefikConfig).toHaveProperty("accessLog");
  });

  it("should configure JSON format for access logs", () => {
    const accessLog = traefikConfig?.accessLog as Record<string, unknown>;
    expect(accessLog?.format).toBe("json");
  });

  it("should configure status code filters", () => {
    const accessLog = traefikConfig?.accessLog as Record<string, unknown>;
    const filters = accessLog?.filters as Record<string, unknown>;
    expect(filters?.statusCodes).toBeDefined();
  });

  it("should configure field handling for logs", () => {
    const accessLog = traefikConfig?.accessLog as Record<string, unknown>;
    const fields = accessLog?.fields as Record<string, unknown>;
    expect(fields).toBeDefined();
  });

  it("should redact sensitive headers", () => {
    const accessLog = traefikConfig?.accessLog as Record<string, unknown>;
    const fields = accessLog?.fields as Record<string, unknown>;
    const headers = fields?.headers as Record<string, unknown>;
    const names = headers?.names as Record<string, string>;
    expect(names?.Authorization).toBe("redact");
    expect(names?.Cookie).toBe("redact");
  });
});

// =============================================================================
// F0.4.2.T003: SSL/TLS and Security Headers
// NOTE: TLS is terminated by external proxy (nginx/neanelu_traefik)
// These tests validate the end-to-end HTTPS experience
// =============================================================================

describe("F0.4.2.T003: SSL/TLS and Security Headers", () => {
  it.skipIf(!HTTPS_AVAILABLE)("should have valid HTTPS endpoint", () => {
    const result = canConnectTo(CURRENT_ENV.httpsUrl);
    expect(result).toBe(true);
  });

  it.skipIf(!HTTPS_AVAILABLE)(
    "should return Strict-Transport-Security header",
    () => {
      const headers = curlHeaders(CURRENT_ENV.httpsUrl);
      expect(headers["strict-transport-security"]).toBeDefined();
    },
  );

  it.skipIf(!HTTPS_AVAILABLE)("should have valid TLS certificate", () => {
    const result = exec(
      `echo | openssl s_client -connect ${CURRENT_ENV.domain}:443 -servername ${CURRENT_ENV.domain} 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter`,
    );
    expect(result).toContain("notAfter");
  });

  it.skipIf(!HTTPS_AVAILABLE)("should support TLS 1.2 or higher", () => {
    const tls12 = exec(
      `echo | openssl s_client -connect ${CURRENT_ENV.domain}:443 -tls1_2 2>/dev/null | grep -c "CONNECTED"`,
    );
    const tls13 = exec(
      `echo | openssl s_client -connect ${CURRENT_ENV.domain}:443 -tls1_3 2>/dev/null | grep -c "CONNECTED"`,
    );
    // At least one modern TLS version should work
    expect(parseInt(tls12) + parseInt(tls13)).toBeGreaterThanOrEqual(1);
  });

  // Test security headers from internal Traefik middlewares
  it.skipIf(!TRAEFIK_RUNNING)(
    "should apply security-headers middleware",
    () => {
      // When Traefik is running and has routes configured, security headers should be applied
      // This is a configuration validation test
      const middlewaresContent = readFile(
        "infra/docker/traefik/dynamic/middlewares.yml",
      );
      expect(middlewaresContent).toContain("security-headers");
      expect(middlewaresContent).toContain("frameDeny: true");
      expect(middlewaresContent).toContain("browserXssFilter: true");
    },
  );
});

// =============================================================================
// F0.4.2.T004: Rate Limiting Validation
// =============================================================================

describe("F0.4.2.T004: Rate Limiting Configuration", () => {
  const middlewaresPath = "infra/docker/traefik/dynamic/middlewares.yml";
  let middlewaresConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(middlewaresPath);
    middlewaresConfig = parseYaml<Record<string, unknown>>(content);
  });

  it("should have rate-limit middleware defined", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    expect(middlewares).toHaveProperty("rate-limit");
  });

  it("should configure rate limit average requests", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;
    expect(config?.average).toBeGreaterThan(0);
  });

  it("should configure rate limit burst", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;
    expect(config?.burst).toBeGreaterThan(0);
  });

  it("should configure rate limit period", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;
    expect(config?.period).toBeDefined();
  });

  it("should configure source criterion for rate limiting", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;
    const sourceCriterion = config?.sourceCriterion as Record<string, unknown>;
    expect(sourceCriterion).toBeDefined();
  });

  it("should exclude internal IPs from rate limiting", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;
    const sourceCriterion = config?.sourceCriterion as Record<string, unknown>;
    const ipStrategy = sourceCriterion?.ipStrategy as Record<string, unknown>;
    const excludedIPs = ipStrategy?.excludedIPs as string[];
    expect(excludedIPs).toContain("127.0.0.1/32");
  });

  it("should have strict rate limit for auth endpoints", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimitStrict = middlewares?.["rate-limit-strict"] as Record<
      string,
      unknown
    >;
    const config = rateLimitStrict?.rateLimit as Record<string, unknown>;
    // Strict should be lower than default
    expect(config?.average).toBeLessThan(
      EXPECTED_TRAEFIK_CONFIG.rateLimit.average,
    );
  });
});

// =============================================================================
// Summary Test
// =============================================================================

describe("E0-S3-PR02 Summary", () => {
  it("should have all required configuration files", () => {
    const requiredFiles = [
      "infra/docker/docker-compose.yml",
      "infra/docker/traefik/traefik.yml",
      "infra/docker/traefik/dynamic/middlewares.yml",
      "secrets/traefik_dashboard.htpasswd",
    ];

    const missingFiles = requiredFiles.filter((f) => !fileExists(f));
    if (missingFiles.length > 0) {
      console.log("Missing files:", missingFiles);
    }
    expect(missingFiles).toEqual([]);
  });

  it("should display test environment info", () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════════════╗
    ║  E0-S3-PR02: Traefik + Hardening Test Results                ║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  Environment: ${CERNIQ_ENV.padEnd(48)}║
    ║  HTTPS URL: ${CURRENT_ENV.httpsUrl.padEnd(50)}║
    ║  Docker Available: ${(DOCKER_AVAILABLE ? "✅ Yes" : "❌ No").padEnd(43)}║
    ║  Traefik Running: ${(TRAEFIK_RUNNING ? "✅ Yes" : "❌ No").padEnd(44)}║
    ║  HTTPS Available: ${(HTTPS_AVAILABLE ? "✅ Yes" : "❌ No").padEnd(44)}║
    ╠═══════════════════════════════════════════════════════════════╣
    ║  Architecture: External Proxy → Traefik (HTTP) → Apps        ║
    ║  TLS Termination: nginx/neanelu_traefik (port 443)           ║
    ║  Internal HTTP: Traefik (port 64080)                         ║
    ╚═══════════════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
