/**
 * Smoke OTel: pentru fiecare familie din `docs/generated/http-trace-smoke-matrix.json`,
 * un Fastify minimal + @fastify/otel; asert că există span cu `http.route` = șablonul din manifest.
 *
 * Depinde de matricea generată: `python3 infra/scripts/build_http_trace_smoke_matrix.py --write=docs/generated/http-trace-smoke-matrix.json`
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { trace } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type GroupSpec = {
  method: string;
  routeTemplate: string;
  samplePath: string;
};

/** Aliniat cu `light-my-request` / `inject` (mai îngust decât `HTTPMethods` din Fastify 5). */
type InjectHttpMethod = "DELETE" | "GET" | "HEAD" | "PATCH" | "POST" | "PUT" | "OPTIONS";

const monorepoRoot = path.join(fileURLToPath(new URL(".", import.meta.url)), "../../../");
const matrixPath = path.join(monorepoRoot, "docs/generated/http-trace-smoke-matrix.json");

function loadMatrix(): { groups: Record<string, GroupSpec> } {
  const raw = readFileSync(matrixPath, "utf8");
  return JSON.parse(raw) as { groups: Record<string, GroupSpec> };
}

describe("HTTP route families — smoke span http.route (matrice manifest)", () => {
  let exporter: InMemorySpanExporter;
  let app: FastifyInstance;
  const matrix: { groups: Record<string, GroupSpec> } = loadMatrix();

  beforeAll(async () => {
    exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);

    const FastifyOtel = (await import("@fastify/otel")).default;
    const instr = new FastifyOtel({ registerOnInitialization: false });
    instr.enable();
    const Fastify = (await import("fastify")).default;
    app = Fastify({ logger: false });
    await app.register(instr.plugin());

    const seen = new Set<string>();
    for (const spec of Object.values(matrix.groups)) {
      const k = `${spec.method} ${spec.routeTemplate}`;
      if (seen.has(k)) continue;
      seen.add(k);
      app.route({
        method: spec.method.toUpperCase() as InjectHttpMethod,
        url: spec.routeTemplate,
        handler: async () => "ok",
      });
    }
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("matricea există și are grupuri", () => {
    expect(Object.keys(matrix.groups).length).toBeGreaterThan(0);
  });

  for (const [groupKey, spec] of Object.entries(matrix.groups)) {
    it(`grup ${groupKey}: ${spec.method} ${spec.routeTemplate}`, async () => {
      exporter.reset();
      const method = spec.method.toUpperCase() as InjectHttpMethod;
      const res = await app.inject({
        method,
        url: spec.samplePath,
        payload: method === "POST" || method === "PUT" || method === "PATCH" ? {} : undefined,
      });
      expect(res.statusCode, `inject ${groupKey}`).toBe(200);
      const spans = exporter.getFinishedSpans();
      const httpRoute = spans.map((s) => s.attributes["http.route"]);
      expect(
        httpRoute,
        `așteptat http.route=${spec.routeTemplate}, am ${JSON.stringify(httpRoute)}`,
      ).toContain(spec.routeTemplate);
    });
  }
});
