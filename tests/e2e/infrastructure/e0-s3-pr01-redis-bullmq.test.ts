/**
 * E0-S3-PR01: Redis + BullMQ (shared Redis model)
 * ==============================================
 *
 * All environments (dev, staging, production) use the shared Redis instance
 * on the orchestrator (ACL + key prefix isolation: `cerniq:`).
 * No local Redis containers in any compose file.
 * Credentials are provided by OpenBao agents in all environments.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || "/var/www/CerniqAPP";

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

describe("F0.3: Redis + BullMQ (shared)", () => {
  it("base compose should NOT define a redis service (externalized to orchestrator)", () => {
    expect(fileExists("infra/docker/docker-compose.yml")).toBe(true);
    const base = parseYaml<Record<string, unknown>>(readFile("infra/docker/docker-compose.yml"));
    expect(base).not.toBeNull();
    const services = (base as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).not.toHaveProperty("redis");
  });

  it("dev compose should NOT define a local redis service (uses shared orchestrator Redis)", () => {
    expect(fileExists("infra/docker/docker-compose.dev.yml")).toBe(true);
    const dev = parseYaml<Record<string, unknown>>(readFile("infra/docker/docker-compose.dev.yml"));
    expect(dev).not.toBeNull();
    const services = (dev as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).not.toHaveProperty("redis");
  });

  it("dev compose should include OpenBao agents for shared service credentials", () => {
    const dev = parseYaml<Record<string, unknown>>(readFile("infra/docker/docker-compose.dev.yml"));
    expect(dev).not.toBeNull();
    const services = (dev as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).toHaveProperty("openbao-agent-api");
    expect(services || {}).toHaveProperty("openbao-agent-workers");
    expect(services || {}).toHaveProperty("openbao-agent-infra");
    expect(services || {}).toHaveProperty("pgbouncer");
  });

  it("OpenBao templates should define REDIS_URL with username and isolation prefixes", () => {
    const apiTpl = readFile("infra/config/openbao/templates/api-env.tpl");
    const workersTpl = readFile("infra/config/openbao/templates/workers-env.tpl");
    expect(apiTpl).toContain("REDIS_URL=redis://");
    expect(workersTpl).toContain("REDIS_URL=redis://");

    expect(apiTpl).toContain("REDIS_PREFIX=");
    expect(apiTpl).toContain("BULLMQ_PREFIX=");
    expect(workersTpl).toContain("REDIS_PREFIX=");
    expect(workersTpl).toContain("BULLMQ_PREFIX=");
  });

  it("repo should include BullMQ prefix smoketest script", () => {
    expect(fileExists("infra/scripts/bullmq-prefix-smoketest.mjs")).toBe(true);
  });
});
