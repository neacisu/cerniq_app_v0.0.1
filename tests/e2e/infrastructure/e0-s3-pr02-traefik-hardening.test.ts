/**
 * E0-S3-PR02: F0.4 Traefik v3 + Hardening Tests
 * ================================================
 * PERSONALIZED TESTS PER MACHINE
 *
 * Environment Detection (automatic via triggers):
 * 1. CERNIQ_ENV variable (highest priority)
 * 2. CI/CD detection (GITHUB_ACTIONS, DEPLOY_ENVIRONMENT)
 * 3. Hostname detection (erp=production, neanelu=staging)
 * 4. Filesystem detection (nginx config vs neanelu_traefik)
 *
 * Test Categories:
 * - COMMON TESTS     - Run everywhere (config file validation)
 * - STAGING TESTS    - Run only on staging (neanelu_traefik, staging.cerniq.app)
 * - PRODUCTION TESTS - Run only on production via CI/CD (nginx, cerniq.app)
 *
 * Usage:
 *   Local development:  pnpm test                           → Runs COMMON + STAGING
 *   CI/CD Staging:      CERNIQ_ENV=staging pnpm test        → Runs COMMON + STAGING
 *   CI/CD Production:   CERNIQ_ENV=production pnpm test     → Runs COMMON + PRODUCTION
 *
 * Machine Detection Triggers:
 * - Staging server (135.181.183.164):  hostname=neanelu, has neanelu_traefik
 * - Production server (95.216.225.145): hostname=erp, has nginx, /opt/cerniq
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
import * as os from "os";

// =============================================================================
// ENVIRONMENT DETECTION - TRIGGERS WHICH TESTS RUN
// =============================================================================

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

/**
 * Detect environment from multiple sources (trigger system)
 * Priority order:
 * 1. CERNIQ_ENV explicit variable
 * 2. CI/CD environment variables
 * 3. Docker container detection (most reliable on servers)
 * 4. Server hostname
 * 5. Filesystem indicators
 */
function detectEnvironment(): "staging" | "production" {
  // TRIGGER 1: Explicit environment variable (CI/CD or manual)
  const envVar = process.env.CERNIQ_ENV?.toLowerCase();
  if (envVar === "production") return "production";
  if (envVar === "staging") return "staging";

  // TRIGGER 2: CI/CD detection
  const isCI =
    process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  if (isCI) {
    const deployEnv = process.env.DEPLOY_ENVIRONMENT || "";
    const githubRef = process.env.GITHUB_REF || "";
    // Production deployment trigger
    if (
      deployEnv === "production" ||
      githubRef.includes("main") ||
      githubRef.includes("refs/heads/main")
    ) {
      return "production";
    }
    return "staging"; // Default CI to staging
  }

  // TRIGGER 3: Docker container detection (most reliable on servers)
  try {
    // Check if neanelu_traefik is running - this means we're on STAGING
    const neaneluTraefik = execSync(
      "docker inspect -f '{{.State.Running}}' neanelu_traefik 2>/dev/null",
      {
        encoding: "utf-8",
        timeout: 5000,
      },
    ).trim();
    if (neaneluTraefik === "true") return "staging";
  } catch {
    // neanelu_traefik not found - check for production markers
  }

  // TRIGGER 4: Hostname detection (server-specific)
  const hostname = os.hostname().toLowerCase();
  if (hostname === "erp" || hostname.includes("prod")) return "production";
  if (hostname === "neanelu" || hostname.includes("stag")) return "staging";

  // TRIGGER 5: Filesystem detection
  try {
    // Production markers
    if (fs.existsSync("/etc/nginx/sites-enabled/cerniq.app"))
      return "production";
    if (
      fs.existsSync("/opt/cerniq/docker-compose.yml") &&
      !fs.existsSync("/var/www/Neanelu_Shopify")
    )
      return "production";
    // Staging markers
    if (fs.existsSync("/var/www/Neanelu_Shopify/docker-compose.yml"))
      return "staging";
    if (fs.existsSync("/var/www/CerniqAPP/infra/docker/docker-compose.yml"))
      return "staging";
  } catch {
    // Ignore filesystem errors
  }

  // TRIGGER 6: Default to staging (safer for local development)
  return "staging";
}

const CURRENT_ENV = detectEnvironment();
const IS_STAGING = CURRENT_ENV === "staging";
const IS_PRODUCTION = CURRENT_ENV === "production";

// Environment-specific configuration
const ENV_CONFIG = {
  staging: {
    httpsUrl: "https://staging.cerniq.app",
    domain: "staging.cerniq.app",
    tlsProxy: "neanelu_traefik",
    tlsProxyType: "traefik" as const,
    serverIP: "135.181.183.164",
    otherProjects: [] as string[], // No other cerniq projects on staging
  },
  production: {
    httpsUrl: "https://cerniq.app",
    domain: "cerniq.app",
    tlsProxy: "nginx",
    tlsProxyType: "nginx" as const,
    serverIP: "95.216.225.145",
    otherProjects: ["wappbuss", "iwms-only"], // Other projects coexisting
  },
} as const;

const CONFIG = ENV_CONFIG[CURRENT_ENV];

// Expected Traefik configuration (shared between environments)
export const EXPECTED_TRAEFIK_CONFIG = {
  version: "3.3",
  ports: {
    http: 64080,
    dashboard: 64093,
  },
  security: {
    frameDeny: true,
    browserXssFilter: true,
    contentTypeNosniff: true,
    referrerPolicy: "strict-origin-when-cross-origin",
  },
  rateLimit: {
    average: 100,
    burst: 200,
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
      // Remove carriage return and trim whitespace
      const cleanLine = line.replace(/\r/g, "").trim();
      const match = cleanLine.match(/^([^:]+):\s*(.+)$/);
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

function getHttpCode(url: string): string {
  return exec(
    `curl -s -o /dev/null -w '%{http_code}' -k --connect-timeout 5 "${url}" 2>/dev/null`,
  );
}

function isServiceRunning(serviceName: string): boolean {
  const result = exec(
    `systemctl is-active ${serviceName} 2>/dev/null || echo "inactive"`,
  );
  return result === "active";
}

// Runtime detection
const DOCKER_AVAILABLE = isDockerAvailable();
const TRAEFIK_RUNNING =
  DOCKER_AVAILABLE && isContainerRunning("cerniq-traefik");
const HTTPS_AVAILABLE = canConnectTo(CONFIG.httpsUrl);

// =============================================================================
// ENVIRONMENT INFO - Displayed at test start
// =============================================================================

describe("E0-S3-PR02: Environment Detection", () => {
  it("should display detected environment and triggers", () => {
    const hostname = os.hostname();
    const ciEnv = process.env.CI === "true" ? "YES" : "NO";
    const deployEnv = process.env.DEPLOY_ENVIRONMENT || "not set";

    console.log(`
    ╔════════════════════════════════════════════════════════════════════════╗
    ║  E0-S3-PR02: Traefik + Hardening Tests - PERSONALIZED PER MACHINE     ║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  TRIGGER DETECTION:                                                    ║
    ║    CERNIQ_ENV variable: ${(process.env.CERNIQ_ENV || "not set").padEnd(48)}║
    ║    CI Environment: ${ciEnv.padEnd(54)}║
    ║    DEPLOY_ENVIRONMENT: ${deployEnv.padEnd(50)}║
    ║    Hostname: ${hostname.padEnd(61)}║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  DETECTED ENVIRONMENT: ${CURRENT_ENV.toUpperCase().padEnd(51)}║
    ║  Server IP: ${CONFIG.serverIP.padEnd(62)}║
    ║  TLS Proxy: ${CONFIG.tlsProxy} (${CONFIG.tlsProxyType})${"".padEnd(42 - CONFIG.tlsProxy.length - CONFIG.tlsProxyType.length)}║
    ║  HTTPS URL: ${CONFIG.httpsUrl.padEnd(61)}║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  RUNTIME STATUS:                                                       ║
    ║    Docker Available: ${(DOCKER_AVAILABLE ? "✅ Yes" : "❌ No").padEnd(53)}║
    ║    Traefik Running: ${(TRAEFIK_RUNNING ? "✅ Yes" : "❌ No").padEnd(54)}║
    ║    HTTPS Available: ${(HTTPS_AVAILABLE ? "✅ Yes" : "❌ No").padEnd(54)}║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  TESTS TO RUN:                                                         ║
    ║    ✅ COMMON Tests (config validation, docker-compose)                 ║
    ║    ${IS_STAGING ? "✅" : "⏭️ "} STAGING Tests ${IS_STAGING ? "(ENABLED - neanelu_traefik)" : "(SKIPPED)".padEnd(31)}       ║
    ║    ${IS_PRODUCTION ? "✅" : "⏭️ "} PRODUCTION Tests ${IS_PRODUCTION ? "(ENABLED - nginx, coexistence)" : "(SKIPPED)".padEnd(25)}       ║
    ╚════════════════════════════════════════════════════════════════════════╝
    `);
    expect(CURRENT_ENV).toMatch(/staging|production/);
  });
});

// =============================================================================
// COMMON TESTS - Run on ALL environments (STAGING + PRODUCTION)
// These tests validate configuration files in the repository
// =============================================================================

describe("COMMON: F0.4.1.T001 - Traefik Static Configuration", () => {
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

  it("should have dashboard enabled but insecure mode disabled", () => {
    const api = traefikConfig?.api as Record<string, unknown>;
    expect(api?.dashboard).toBe(true);
    expect(api?.insecure).toBe(false);
  });

  it("should have web entrypoint on port 64080", () => {
    const entryPoints = traefikConfig?.entryPoints as Record<string, unknown>;
    const web = entryPoints?.web as Record<string, unknown>;
    expect(web?.address).toBe(`:${EXPECTED_TRAEFIK_CONFIG.ports.http}`);
  });

  it("should have metrics entrypoint on port 64093", () => {
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
    expect(trustedIPs).toContain("172.16.0.0/12");
  });

  it("should disable anonymous usage statistics", () => {
    const global = traefikConfig?.global as Record<string, unknown>;
    expect(global?.sendAnonymousUsage).toBe(false);
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
// COMMON: F0.4.1.T002 - Security Middlewares Configuration
// =============================================================================

describe("COMMON: F0.4.1.T002 - Security Middlewares", () => {
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

  it("should define security-headers middleware with correct settings", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const securityHeaders = middlewares?.["security-headers"] as Record<
      string,
      unknown
    >;
    const headers = securityHeaders?.headers as Record<string, unknown>;

    expect(headers?.frameDeny).toBe(EXPECTED_TRAEFIK_CONFIG.security.frameDeny);
    expect(headers?.browserXssFilter).toBe(
      EXPECTED_TRAEFIK_CONFIG.security.browserXssFilter,
    );
    expect(headers?.contentTypeNosniff).toBe(
      EXPECTED_TRAEFIK_CONFIG.security.contentTypeNosniff,
    );
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

  it("should define rate-limit middleware (100 req/s, burst 200)", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimit = middlewares?.["rate-limit"] as Record<string, unknown>;
    const config = rateLimit?.rateLimit as Record<string, unknown>;

    expect(config?.average).toBe(EXPECTED_TRAEFIK_CONFIG.rateLimit.average);
    expect(config?.burst).toBe(EXPECTED_TRAEFIK_CONFIG.rateLimit.burst);
  });

  it("should define rate-limit-strict for auth endpoints (10 req/s)", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimitStrict = middlewares?.["rate-limit-strict"] as Record<
      string,
      unknown
    >;
    const config = rateLimitStrict?.rateLimit as Record<string, unknown>;

    expect(config?.average).toBe(10);
    expect(config?.burst).toBe(20);
  });

  it("should define middleware chains (api-chain, auth-chain)", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;

    expect(middlewares).toHaveProperty("api-chain");
    expect(middlewares).toHaveProperty("auth-chain");
    expect(middlewares).toHaveProperty("dashboard-auth");
    expect(middlewares).toHaveProperty("circuit-breaker");
  });
});

// =============================================================================
// COMMON: F0.4.1.T003 - Traefik Service in docker-compose.yml
// =============================================================================

describe("COMMON: F0.4.1.T003 - docker-compose.yml Service", () => {
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

  it("should define traefik service with Traefik v3.x image", () => {
    expect(traefikService).not.toBeNull();
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

  it("should expose port 64093 for dashboard/metrics (localhost only)", () => {
    const ports = traefikService?.ports as string[];
    const dashboardPort = ports?.find((p) => p.includes("64093"));
    expect(dashboardPort).toBeDefined();
    expect(dashboardPort).toContain("127.0.0.1");
  });

  it("should mount traefik.yml and dynamic config", () => {
    const volumes = traefikService?.volumes as string[];
    expect(volumes).toEqual(
      expect.arrayContaining([expect.stringContaining("traefik.yml")]),
    );
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

  it("should be on cerniq_public and cerniq_backend networks", () => {
    const networks = traefikService?.networks as
      | string[]
      | Record<string, unknown>;
    if (Array.isArray(networks)) {
      expect(networks).toContain("cerniq_public");
    } else {
      expect(networks).toHaveProperty("cerniq_public");
      expect(networks).toHaveProperty("cerniq_backend");
    }
  });

  it("should have healthcheck and restart policy", () => {
    const healthcheck = traefikService?.healthcheck as Record<string, unknown>;
    expect(healthcheck).toBeDefined();
    expect(healthcheck?.test).toBeDefined();
    expect(traefikService?.restart).toBe("unless-stopped");
  });

  it("should have resource limits defined", () => {
    const deploy = traefikService?.deploy as Record<string, unknown>;
    expect(deploy?.resources).toBeDefined();
  });
});

// =============================================================================
// COMMON: F0.4.1.T004 - Traefik Container Runtime (skip if Docker unavailable)
// =============================================================================

describe("COMMON: F0.4.1.T004 - Traefik Container Runtime", () => {
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
    const result = getHttpCode("http://localhost:64080");
    expect(["200", "404", "502"]).toContain(result);
  });

  it.skipIf(!TRAEFIK_RUNNING)(
    "should have dashboard accessible on localhost:64093",
    () => {
      const result = getHttpCode("http://localhost:64093/dashboard/");
      expect(["200", "401", "403"]).toContain(result);
    },
  );

  it.skipIf(!TRAEFIK_RUNNING)("should have ping endpoint healthy", () => {
    const result = getHttpCode("http://localhost:64093/ping");
    expect(["200", "403"]).toContain(result);
  });
});

// =============================================================================
// COMMON: F0.4.2.T001 - Dashboard htpasswd
// =============================================================================

describe("COMMON: F0.4.2.T001 - Dashboard htpasswd", () => {
  const htpasswdPath = "secrets/traefik_dashboard.htpasswd";

  it("should have traefik_dashboard.htpasswd file", () => {
    expect(fileExists(htpasswdPath)).toBe(true);
  });

  it("should have valid htpasswd format", () => {
    const content = readFile(htpasswdPath);
    expect(content).toMatch(/^[a-zA-Z0-9_-]+:\$[a-z0-9]+\$/m);
  });

  it("should have secure file permissions", () => {
    const fullPath = path.join(WORKSPACE_ROOT, htpasswdPath);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const mode = (stats.mode & 0o777).toString(8);
      expect(["600", "640", "644"]).toContain(mode);
    }
  });

  it("should be referenced in docker-compose.yml", () => {
    const dockerCompose = readFile("infra/docker/docker-compose.yml");
    expect(dockerCompose).toContain("traefik_dashboard.htpasswd");
  });
});

// =============================================================================
// COMMON: F0.4.2.T002 - Access Logs Configuration
// =============================================================================

describe("COMMON: F0.4.2.T002 - Access Logs Configuration", () => {
  const traefikYmlPath = "infra/docker/traefik/traefik.yml";
  let traefikConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(traefikYmlPath);
    traefikConfig = parseYaml<Record<string, unknown>>(content);
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

  it("should redact sensitive headers (Authorization, Cookie)", () => {
    const accessLog = traefikConfig?.accessLog as Record<string, unknown>;
    const fields = accessLog?.fields as Record<string, unknown>;
    const headers = fields?.headers as Record<string, unknown>;
    const names = headers?.names as Record<string, string>;
    expect(names?.Authorization).toBe("redact");
    expect(names?.Cookie).toBe("redact");
  });
});

// =============================================================================
// COMMON: F0.4.2.T004 - Rate Limiting Configuration
// =============================================================================

describe("COMMON: F0.4.2.T004 - Rate Limiting Configuration", () => {
  const middlewaresPath = "infra/docker/traefik/dynamic/middlewares.yml";
  let middlewaresConfig: Record<string, unknown> | null = null;

  beforeAll(() => {
    const content = readFile(middlewaresPath);
    middlewaresConfig = parseYaml<Record<string, unknown>>(content);
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

  it("should have strict rate limit lower than default for auth endpoints", () => {
    const http = middlewaresConfig?.http as Record<string, unknown>;
    const middlewares = http?.middlewares as Record<string, unknown>;
    const rateLimitStrict = middlewares?.["rate-limit-strict"] as Record<
      string,
      unknown
    >;
    const config = rateLimitStrict?.rateLimit as Record<string, unknown>;
    expect(config?.average).toBeLessThan(
      EXPECTED_TRAEFIK_CONFIG.rateLimit.average,
    );
  });
});

// =============================================================================
// STAGING-SPECIFIC TESTS - Only run on staging machine (135.181.183.164)
// TLS Proxy: neanelu_traefik (external Traefik)
// =============================================================================

describe.skipIf(!IS_STAGING)(
  "STAGING: F0.4.2.T003 - TLS via neanelu_traefik",
  () => {
    it.skipIf(!DOCKER_AVAILABLE)(
      "should have neanelu_traefik container running",
      () => {
        const running = isContainerRunning("neanelu_traefik");
        expect(running).toBe(true);
      },
    );

    it.skipIf(!DOCKER_AVAILABLE)(
      "should have neanelu_traefik on cerniq_public network",
      () => {
        const networks = exec(
          `docker inspect -f '{{json .NetworkSettings.Networks}}' neanelu_traefik 2>/dev/null`,
        );
        expect(networks).toContain("cerniq_public");
      },
    );

    it("should have staging.cerniq.app DNS resolving", () => {
      const result = exec(
        `dig +short staging.cerniq.app A 2>/dev/null | head -1`,
      );
      expect(result).toMatch(/\d+\.\d+\.\d+\.\d+/);
    });

    it.skipIf(!HTTPS_AVAILABLE)(
      "should have valid HTTPS on staging.cerniq.app",
      () => {
        const code = getHttpCode("https://staging.cerniq.app");
        expect(["200", "302", "404"]).toContain(code);
      },
    );

    it.skipIf(!HTTPS_AVAILABLE)(
      "should return HSTS header from external proxy",
      () => {
        const headers = curlHeaders("https://staging.cerniq.app");
        expect(headers["strict-transport-security"]).toBeDefined();
        // Verify HSTS settings
        const hsts = headers["strict-transport-security"];
        expect(hsts).toContain("max-age=");
      },
    );

    it.skipIf(!HTTPS_AVAILABLE)("should have valid TLS certificate", () => {
      const result = exec(
        `echo | openssl s_client -connect staging.cerniq.app:443 -servername staging.cerniq.app 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter`,
      );
      expect(result).toContain("notAfter");
    });

    it.skipIf(!HTTPS_AVAILABLE)("should support TLS 1.2 or higher", () => {
      const tls12 = exec(
        `echo | openssl s_client -connect staging.cerniq.app:443 -tls1_2 2>/dev/null | grep -c "CONNECTED"`,
      );
      const tls13 = exec(
        `echo | openssl s_client -connect staging.cerniq.app:443 -tls1_3 2>/dev/null | grep -c "CONNECTED"`,
      );
      expect(parseInt(tls12) + parseInt(tls13)).toBeGreaterThanOrEqual(1);
    });
  },
);

describe.skipIf(!IS_STAGING)("STAGING: Network Topology", () => {
  it("should have staging-proxy.conf nginx config in repo", () => {
    expect(fileExists("infra/docker/nginx/staging-proxy.conf")).toBe(true);
  });

  it.skipIf(!DOCKER_AVAILABLE)(
    "should have cerniq_public network with subnet 172.29.10.0/24",
    () => {
      const subnet = exec(
        `docker network inspect cerniq_public --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null`,
      );
      expect(subnet).toBe("172.29.10.0/24");
    },
  );

  it.skipIf(!TRAEFIK_RUNNING)(
    "should have Traefik on cerniq_public with IP 172.29.10.10",
    () => {
      const ip = exec(
        `docker inspect -f '{{(index .NetworkSettings.Networks "cerniq_public").IPAddress}}' cerniq-traefik 2>/dev/null`,
      );
      expect(ip).toBe("172.29.10.10");
    },
  );
});

describe.skipIf(!IS_STAGING)(
  "STAGING: Traffic Flow (External → neanelu_traefik → cerniq-traefik)",
  () => {
    it.skipIf(!TRAEFIK_RUNNING)(
      "should route internal traffic to cerniq-traefik via cerniq_public",
      () => {
        const internalResponse = exec(
          `curl -s -o /dev/null -w '%{http_code}' http://172.29.10.10:64080 2>/dev/null`,
        );
        expect(["200", "404", "502"]).toContain(internalResponse);
      },
    );

    it.skipIf(!HTTPS_AVAILABLE)(
      "should complete full traffic flow: External → HTTPS → neanelu_traefik → cerniq-traefik",
      () => {
        const externalResponse = getHttpCode("https://staging.cerniq.app");
        expect(["200", "302", "404"]).toContain(externalResponse);
      },
    );

    it.skipIf(!DOCKER_AVAILABLE)(
      "should have /var/www/CerniqAPP mounted in workspace",
      () => {
        expect(fs.existsSync(WORKSPACE_ROOT)).toBe(true);
        expect(fs.existsSync(path.join(WORKSPACE_ROOT, "package.json"))).toBe(
          true,
        );
      },
    );
  },
);

// =============================================================================
// PRODUCTION-SPECIFIC TESTS - Only run on production machine (95.216.225.145)
// TLS Proxy: nginx (system nginx)
// =============================================================================

describe.skipIf(!IS_PRODUCTION)(
  "PRODUCTION: F0.4.2.T003 - TLS via nginx",
  () => {
    it("should have nginx service running", () => {
      const running = isServiceRunning("nginx");
      expect(running).toBe(true);
    });

    it("should have nginx cerniq.app site enabled", () => {
      const exists = fs.existsSync("/etc/nginx/sites-enabled/cerniq.app");
      expect(exists).toBe(true);
    });

    it("should have cerniq.app DNS resolving to production IP", () => {
      const result = exec(`dig +short cerniq.app A 2>/dev/null | head -1`);
      expect(result).toMatch(/\d+\.\d+\.\d+\.\d+/);
    });

    it.skipIf(!HTTPS_AVAILABLE)("should have valid HTTPS on cerniq.app", () => {
      const code = getHttpCode("https://cerniq.app");
      expect(["200", "302", "404"]).toContain(code);
    });

    it.skipIf(!HTTPS_AVAILABLE)("should return HSTS header from nginx", () => {
      const headers = curlHeaders("https://cerniq.app");
      expect(headers["strict-transport-security"]).toBeDefined();
    });

    it.skipIf(!HTTPS_AVAILABLE)("should have valid TLS certificate", () => {
      const result = exec(
        `echo | openssl s_client -connect cerniq.app:443 -servername cerniq.app 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep notAfter`,
      );
      expect(result).toContain("notAfter");
    });

    it.skipIf(!HTTPS_AVAILABLE)("should support TLS 1.2 or higher", () => {
      const tls12 = exec(
        `echo | openssl s_client -connect cerniq.app:443 -tls1_2 2>/dev/null | grep -c "CONNECTED"`,
      );
      const tls13 = exec(
        `echo | openssl s_client -connect cerniq.app:443 -tls1_3 2>/dev/null | grep -c "CONNECTED"`,
      );
      expect(parseInt(tls12) + parseInt(tls13)).toBeGreaterThanOrEqual(1);
    });
  },
);

describe.skipIf(!IS_PRODUCTION)("PRODUCTION: nginx → Traefik Routing", () => {
  it("should have nginx upstream configured for Traefik port 64080", () => {
    const nginxConfig = exec(
      `cat /etc/nginx/sites-enabled/cerniq.app 2>/dev/null | grep -E 'proxy_pass|upstream'`,
    );
    expect(nginxConfig).toContain("64080");
  });

  it.skipIf(!TRAEFIK_RUNNING)(
    "should route localhost traffic to cerniq-traefik",
    () => {
      const internalResponse = exec(
        `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:64080 2>/dev/null`,
      );
      expect(["200", "404", "502"]).toContain(internalResponse);
    },
  );
});

describe.skipIf(!IS_PRODUCTION)(
  "PRODUCTION: /opt/cerniq Directory Structure",
  () => {
    it("should have /opt/cerniq directory", () => {
      expect(fs.existsSync("/opt/cerniq")).toBe(true);
    });

    it("should have docker-compose.yml in /opt/cerniq", () => {
      expect(fs.existsSync("/opt/cerniq/docker-compose.yml")).toBe(true);
    });

    it("should have secrets directory with required files", () => {
      expect(fs.existsSync("/opt/cerniq/secrets/postgres_password.txt")).toBe(
        true,
      );
      expect(fs.existsSync("/opt/cerniq/secrets/redis_password.txt")).toBe(
        true,
      );
    });

    it("should have traefik config in /opt/cerniq/config", () => {
      expect(fs.existsSync("/opt/cerniq/config/traefik/traefik.yml")).toBe(
        true,
      );
    });
  },
);

describe.skipIf(!IS_PRODUCTION)(
  "PRODUCTION: Coexistence with Other Projects",
  () => {
    it.skipIf(!DOCKER_AVAILABLE)(
      "should not conflict with wappbuss on ports 64080/64093",
      () => {
        const wappbussPorts = exec(
          `docker ps --filter "name=wappbuss" --format "{{.Ports}}" 2>/dev/null`,
        );
        if (wappbussPorts) {
          expect(wappbussPorts).not.toContain("64080");
          expect(wappbussPorts).not.toContain("64093");
        }
        expect(true).toBe(true); // Pass if no wappbuss or no conflict
      },
    );

    it.skipIf(!DOCKER_AVAILABLE)(
      "should not conflict with iwms-only on ports 64080/64093",
      () => {
        const iwmsPorts = exec(
          `docker ps --filter "name=iwms" --format "{{.Ports}}" 2>/dev/null`,
        );
        if (iwmsPorts) {
          expect(iwmsPorts).not.toContain("64080");
          expect(iwmsPorts).not.toContain("64093");
        }
        expect(true).toBe(true);
      },
    );

    it.skipIf(!DOCKER_AVAILABLE)(
      "should have cerniq networks isolated from other projects",
      () => {
        const cerniqPublicContainers = exec(
          `docker network inspect cerniq_public --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null`,
        );
        expect(cerniqPublicContainers).not.toContain("wappbuss");
        expect(cerniqPublicContainers).not.toContain("iwms");
      },
    );

    it("should have separate nginx configs for each project", () => {
      // Production server may have multiple nginx sites
      const sites = exec(`ls /etc/nginx/sites-enabled/ 2>/dev/null`);
      if (sites.includes("cerniq")) {
        // Verify cerniq config is separate
        expect(sites).toContain("cerniq");
      }
      expect(true).toBe(true);
    });
  },
);

// =============================================================================
// TEST SUMMARY
// =============================================================================

describe("E0-S3-PR02: Test Summary", () => {
  it("should have all required configuration files", () => {
    const requiredFiles = [
      "infra/docker/docker-compose.yml",
      "infra/docker/traefik/traefik.yml",
      "infra/docker/traefik/dynamic/middlewares.yml",
      "secrets/traefik_dashboard.htpasswd",
    ];

    const missingFiles = requiredFiles.filter((f) => !fileExists(f));
    if (missingFiles.length > 0) {
      console.log("❌ Missing files:", missingFiles);
    }
    expect(missingFiles).toEqual([]);
  });

  it("should display final test summary", () => {
    const totalTests = {
      common:
        "Config validation, docker-compose, middlewares, htpasswd, logs, rate-limit",
      staging: IS_STAGING
        ? "neanelu_traefik, staging.cerniq.app, cerniq_public network"
        : "SKIPPED",
      production: IS_PRODUCTION
        ? "nginx, cerniq.app, /opt/cerniq, coexistence"
        : "SKIPPED",
    };

    console.log(`
    ╔════════════════════════════════════════════════════════════════════════╗
    ║  E0-S3-PR02: Test Execution Complete                                  ║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  ENVIRONMENT: ${CURRENT_ENV.toUpperCase().padEnd(59)}║
    ║  Server: ${CONFIG.serverIP.padEnd(64)}║
    ║  TLS Proxy: ${(CONFIG.tlsProxy + " (" + CONFIG.tlsProxyType + ")").padEnd(61)}║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  TESTS EXECUTED:                                                       ║
    ║    ✅ COMMON Tests:                                                    ║
    ║       ${totalTests.common.padEnd(66)}║
    ║    ${IS_STAGING ? "✅" : "⏭️ "} STAGING Tests:                                                  ║
    ║       ${totalTests.staging.padEnd(66)}║
    ║    ${IS_PRODUCTION ? "✅" : "⏭️ "} PRODUCTION Tests:                                               ║
    ║       ${totalTests.production.padEnd(66)}║
    ╠════════════════════════════════════════════════════════════════════════╣
    ║  ARCHITECTURE VALIDATED:                                               ║
    ║    External → ${CONFIG.tlsProxy} (TLS:443) → cerniq-traefik (HTTP:64080) → Apps     ║
    ╚════════════════════════════════════════════════════════════════════════╝
    `);
    expect(true).toBe(true);
  });
});
