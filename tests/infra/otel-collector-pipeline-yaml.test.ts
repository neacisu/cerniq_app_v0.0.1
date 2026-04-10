/**
 * Validează că `infra/config/otel/otel-collector-pipeline.yaml` este config „clasică” (pipelines),
 * nu Declarative Configuration — și că se aliniază la schema JSON din repo.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const YAML_PATH = path.join(ROOT, "infra/config/otel/otel-collector-pipeline.yaml");

function assertYamlRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  expect(value, label).toBeTruthy();
  expect(typeof value, label).toBe("object");
  expect(value, label).not.toBeNull();
  expect(Array.isArray(value), label).toBe(false);
}

function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    return false;
  }
  return Object.keys(v).length > 0;
}

describe("infra/config/otel/otel-collector-pipeline.yaml", () => {
  it("este YAML pipeline valid și nu folosește Declarative Configuration (file_format)", () => {
    const raw = readFileSync(YAML_PATH, "utf-8");
    expect(raw).toMatch(/\$schema=.*otel-collector-pipeline\.schema\.json/);
    const docUnknown: unknown = parseYaml(raw);
    expect(docUnknown).toBeTruthy();
    assertYamlRecord(docUnknown, "root");
    expect(
      docUnknown.file_format,
      "Declarative Configuration ar însemna alt tip de fișier — acesta e pipeline clasic.",
    ).toBeUndefined();
    expect(isNonEmptyObject(docUnknown.receivers)).toBe(true);
    expect(isNonEmptyObject(docUnknown.processors)).toBe(true);
    expect(isNonEmptyObject(docUnknown.exporters)).toBe(true);
    const service = docUnknown.service;
    assertYamlRecord(service, "service");
    const pipelines = service.pipelines;
    assertYamlRecord(pipelines, "pipelines");
    for (const name of ["traces", "metrics", "logs"] as const) {
      const pipeline = pipelines[name];
      assertYamlRecord(pipeline, name);
      expect(isNonEmptyObject(pipeline)).toBe(true);
    }
  });
});
