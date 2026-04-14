/**
 * L4 agri:culturi — integrare cu DB mock + aserțiuni telemetrie §5B (evenimente + Prometheus).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as workerShared from "@cerniq/worker-shared";

const hoisted = vi.hoisted(() => ({
  findFirst: vi.fn(),
  sqlTag: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
    { raw: vi.fn((s: unknown) => s) },
  ),
}));

vi.mock("@cerniq/db", () => ({
  db: {
    query: {
      silverCompanies: {
        findFirst: hoisted.findFirst,
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
  silverCompanies: { id: "id", metadata: "metadata", updatedAt: "updatedAt" },
  silverEnrichmentLog: {},
  sql: hoisted.sqlTag,
  setSessionTenantId: vi.fn(async () => undefined),
}));

import { culturiClassifierProcessor } from "./l4-culturi-classifier.js";

const TENANT = "00000000-0000-4000-8000-000000000001";
const COMPANY = "00000000-0000-4000-8000-000000000002";
const CORR_SSE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function counterValue(
  json: Awaited<ReturnType<typeof workerShared.metricsRegistry.getMetricsAsJSON>>,
  name: string,
  label: Record<string, string>,
): number {
  const m = json.find((x) => x.name === name) as
    | { type?: string; values: Array<{ value: number; labels: Record<string, string> }> }
    | undefined;
  if (m?.type !== "counter") return 0;
  const hit = m.values.find(
    (v) => v.value > 0 && Object.entries(label).every(([k, val]) => v.labels[k] === val),
  );
  return hit?.value ?? 0;
}

describe("l4-culturi-classifier processor (mock db)", () => {
  beforeEach(() => {
    workerShared.metricsRegistry.resetMetrics();
    hoisted.findFirst.mockReset();
    vi.spyOn(workerShared, "emitCognitiveEvent").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clasifică cu succes, emite phase_* și incrementează outcome success", async () => {
    hoisted.findFirst.mockResolvedValue({
      id: COMPANY,
      tenantId: TENANT,
      codCaenPrincipal: "0111",
    });
    const job = {
      id: "l4-ok",
      data: {
        tenantId: TENANT,
        companyId: COMPANY,
        correlationId: CORR_SSE,
      },
    };
    const out = await culturiClassifierProcessor(job as never, {} as never);
    expect(out).toMatchObject({ ok: true, status: "success" });

    const emit = vi.mocked(workerShared.emitCognitiveEvent);
    const types = emit.mock.calls.map((c) => (c[1] as { eventType?: string })?.eventType);
    expect(types).toContain("phase_classify_start");
    expect(types).toContain("phase_metadata_persisted");

    const json = await workerShared.metricsRegistry.getMetricsAsJSON();
    expect(
      counterValue(json, "cerniq_cognitive_agri_culturi_outcome_total", { outcome: "success" }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("not_found: phase_not_found + metrică not_found", async () => {
    hoisted.findFirst.mockResolvedValue(undefined);
    const job = { id: "l4-nf", data: { tenantId: TENANT, companyId: COMPANY } };
    const out = await culturiClassifierProcessor(job as never, {} as never);
    expect(out).toMatchObject({ ok: false, status: "not_found" });

    const emit = vi.mocked(workerShared.emitCognitiveEvent);
    expect(
      emit.mock.calls.some(
        (c) => (c[1] as { eventType?: string })?.eventType === "phase_not_found",
      ),
    ).toBe(true);

    const json = await workerShared.metricsRegistry.getMetricsAsJSON();
    expect(
      counterValue(json, "cerniq_cognitive_agri_culturi_outcome_total", { outcome: "not_found" }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("eroare DB: propagă și incrementează outcome error", async () => {
    hoisted.findFirst.mockRejectedValue(new Error("db down"));
    const job = { id: "l4-err", data: { tenantId: TENANT, companyId: COMPANY } };
    await expect(culturiClassifierProcessor(job as never, {} as never)).rejects.toThrow("db down");

    const json = await workerShared.metricsRegistry.getMetricsAsJSON();
    expect(
      counterValue(json, "cerniq_cognitive_agri_culturi_outcome_total", { outcome: "error" }),
    ).toBeGreaterThanOrEqual(1);
  });
});
