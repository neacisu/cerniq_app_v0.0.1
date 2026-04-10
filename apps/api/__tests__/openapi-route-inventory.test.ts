/**
 * Inventar rute OpenAPI vs snapshot în `docs/generated/api-route-inventory.json`.
 * Actualizare: `UPDATE_ROUTE_INVENTORY=1 pnpm --filter @cerniq/api exec vitest run __tests__/openapi-route-inventory.test.ts`
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..");
const INVENTORY_PATH = path.join(repoRoot, "docs", "generated", "api-route-inventory.json");

type RouteInventory = {
  generatedAt: string;
  paths: Record<string, string[]>;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeFromSwagger(spec: Record<string, unknown>): RouteInventory {
  const pathsRaw = spec.paths;
  const paths: Record<string, string[]> = {};
  if (!isPlainObject(pathsRaw)) {
    return { generatedAt: new Date().toISOString(), paths };
  }
  const routeKeys = Object.keys(pathsRaw).toSorted((a, b) => a.localeCompare(b, "en"));
  for (const route of routeKeys) {
    const entry = pathsRaw[route];
    if (!isPlainObject(entry)) continue;
    const methods = Object.keys(entry)
      .filter((k) => !k.startsWith("x-") && k !== "parameters")
      .filter((k) => isPlainObject(entry[k]))
      .map((m) => m.toUpperCase())
      .toSorted((a, b) => a.localeCompare(b, "en"));
    paths[route] = methods;
  }
  return { generatedAt: new Date().toISOString(), paths };
}

describe("OpenAPI route inventory (snapshot)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("se aliniază la docs/generated/api-route-inventory.json (sau îl regenerează cu UPDATE_ROUTE_INVENTORY=1)", async () => {
    const spec = app.swagger() as Record<string, unknown>;
    const live = normalizeFromSwagger(spec);

    if (process.env.UPDATE_ROUTE_INVENTORY === "1") {
      mkdirSync(path.dirname(INVENTORY_PATH), { recursive: true });
      writeFileSync(INVENTORY_PATH, `${JSON.stringify(live, null, 2)}\n`, "utf-8");
      return;
    }

    expect(
      existsSync(INVENTORY_PATH),
      `Lipsește ${INVENTORY_PATH} — rulează cu UPDATE_ROUTE_INVENTORY=1`,
    ).toBe(true);
    const disk = JSON.parse(readFileSync(INVENTORY_PATH, "utf-8")) as RouteInventory;
    expect(live.paths).toEqual(disk.paths);
  });
});
