/**
 * E0-S3-PR01: Redis + BullMQ (shared Redis model)
 * ==============================================
 *
 * New infrastructure model:
 * - Production/staging do NOT run a local Redis container in the Cerniq stack.
 * - Cerniq uses a shared Redis instance on the orchestrator (ACL + key prefix
 *   isolation: `cerniq:`).
 * - For local development only, `docker-compose.dev.yml` provides a redis
 *   service (profile `dev`) to keep workflows working.
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
    const base = parseYaml<Record<string, unknown>>(
      readFile("infra/docker/docker-compose.yml"),
    );
    expect(base).not.toBeNull();
    const services = (base as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).not.toHaveProperty("redis");
  });

  it("dev override should define a local redis service for development only", () => {
    expect(fileExists("infra/docker/docker-compose.dev.yml")).toBe(true);
    const dev = parseYaml<Record<string, unknown>>(
      readFile("infra/docker/docker-compose.dev.yml"),
    );
    expect(dev).not.toBeNull();
    const services = (dev as Record<string, unknown>).services as
      | Record<string, unknown>
      | undefined;
    expect(services || {}).toHaveProperty("redis");

    const redis = (services as Record<string, unknown>).redis as Record<
      string,
      unknown
    >;
    expect(redis.image).toBe("redis:8.6.0");
    expect(redis.container_name).toBe("cerniq-redis-dev");
  });

  it("OpenBao templates should define REDIS_URL with username and isolation prefixes", () => {
    const apiTpl = readFile("infra/config/openbao/templates/api-env.tpl");
    const workersTpl = readFile(
      "infra/config/openbao/templates/workers-env.tpl",
    );
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
