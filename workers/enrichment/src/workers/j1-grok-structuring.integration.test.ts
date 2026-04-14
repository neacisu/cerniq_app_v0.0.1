/**
 * J1 — integrare cu mock `infraqStructuredJson` (fără apel rețea).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const j1DbHoisted = vi.hoisted(() => ({
  sqlTag: Object.assign(
    vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
    { raw: vi.fn((s: unknown) => s) },
  ),
}));

vi.mock("../lib/infraq-structured-json.js", () => ({
  infraqStructuredJson: vi.fn(async () => ({
    denumire: "Test SRL",
    /** Gol: fără CUI → `canAutoApply` după regulile J1 (nu e nevoie de checksum valid). */
    cui: "",
    confidence: 0.95,
    cod_caen_principal: "0111",
    is_agricol: false,
  })),
}));

vi.mock("./pipeline-utils.js", () => ({
  createHitlApprovalTask: vi.fn(async () => undefined),
}));

vi.mock("@cerniq/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async () => undefined),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(async () => undefined),
    })),
  },
  silverCompanies: { id: "id", metadata: "metadata", lastEnrichedAt: "lastEnrichedAt" },
  silverEnrichmentLog: {},
  jobLogs: {},
  sql: j1DbHoisted.sqlTag,
  setSessionTenantId: vi.fn(async () => undefined),
}));

import { grokStructuringProcessor, resolveGrokStructuringRawData } from "./j1-grok-structuring.js";
import { infraqStructuredJson } from "../lib/infraq-structured-json.js";
import { createHitlApprovalTask } from "./pipeline-utils.js";
import * as workerShared from "@cerniq/worker-shared";

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

describe("resolveGrokStructuringRawData", () => {
  it("folosește rawData când e prezent", () => {
    expect(
      resolveGrokStructuringRawData({
        tenantId: "t",
        companyId: "c",
        rawData: { a: 1 },
        cui: "x",
      }),
    ).toEqual({ a: 1 });
  });

  it("agregă câmpuri plate când rawData lipsește", () => {
    expect(
      resolveGrokStructuringRawData({
        tenantId: "t",
        companyId: "c",
        cui: "RO1",
        adresa: "Str 1",
      }),
    ).toEqual({ cui: "RO1", adresa: "Str 1" });
  });
});

describe("j1-grok-structuring processor (mock infraq)", () => {
  beforeEach(() => {
    vi.mocked(infraqStructuredJson).mockClear();
    vi.mocked(infraqStructuredJson).mockResolvedValue({
      denumire: "Test SRL",
      cui: "",
      confidence: 0.95,
      cod_caen_principal: "0111",
      is_agricol: false,
    });
    workerShared.metricsRegistry.resetMetrics();
    vi.spyOn(workerShared, "emitCognitiveEvent").mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("apelează infraqStructuredJson și întoarce structurare aplicată", async () => {
    const job = {
      id: "job-1",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        rawData: { name: "X" },
      },
    };
    const out = await grokStructuringProcessor(job as never, {} as never);
    expect(vi.mocked(infraqStructuredJson)).toHaveBeenCalled();
    expect(out).toMatchObject({ ok: true });
  });

  it("emite phase_* pentru calea auto_applied și incrementează metricile cognitive", async () => {
    const job = {
      id: "job-phases",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        rawData: { name: "X" },
        correlationId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      },
    };
    await grokStructuringProcessor(job as never, {} as never);
    const emit = vi.mocked(workerShared.emitCognitiveEvent);
    const types = emit.mock.calls.map((c) => (c[1] as { eventType?: string })?.eventType);
    expect(types).toEqual(
      expect.arrayContaining([
        "phase_llm_request",
        "phase_llm_response",
        "phase_validate_schema",
        "phase_silver_write",
      ]),
    );
    const json = await workerShared.metricsRegistry.getMetricsAsJSON();
    expect(
      counterValue(json, "cerniq_cognitive_ai_structure_outcome_total", {
        outcome: "auto_applied",
      }),
    ).toBeGreaterThanOrEqual(1);
    const hist = json.find((m) => m.name === "cerniq_cognitive_ai_structure_llm_seconds");
    expect((hist as { type?: string } | undefined)?.type).toBe("histogram");
    expect((hist?.values.length ?? 0) > 0).toBe(true);
  });

  it("la încredere scăzută emite hitl_queued, creează task HITL și incrementează outcome hitl", async () => {
    vi.mocked(infraqStructuredJson).mockResolvedValueOnce({
      denumire: "Test SRL",
      cui: "",
      confidence: 0.5,
      cod_caen_principal: "0111",
      is_agricol: false,
    });
    const job = {
      id: "job-hitl",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        rawData: { name: "Y" },
      },
    };
    const out = await grokStructuringProcessor(job as never, {} as never);
    expect(out).toMatchObject({ ok: true, status: "hitl_required" });
    const emit = vi.mocked(workerShared.emitCognitiveEvent);
    expect(
      emit.mock.calls.some(
        (c) => (c[1] as { eventType?: string })?.eventType === "phase_hitl_queued",
      ),
    ).toBe(true);
    expect(vi.mocked(createHitlApprovalTask)).toHaveBeenCalled();
    const json = await workerShared.metricsRegistry.getMetricsAsJSON();
    expect(
      counterValue(json, "cerniq_cognitive_ai_structure_outcome_total", { outcome: "hitl" }),
    ).toBeGreaterThanOrEqual(1);
  });

  it("acceptă payload P1 (fără rawData) și trimite câmpurile plate la LLM", async () => {
    const job = {
      id: "job-p1",
      data: {
        tenantId: "00000000-0000-4000-8000-000000000001",
        companyId: "00000000-0000-4000-8000-000000000002",
        cui: "12345678",
        adresa: "Bd. Test 1",
        localitate: "Braila",
        correlationId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      },
    };
    await grokStructuringProcessor(job as never, {} as never);
    expect(vi.mocked(infraqStructuredJson)).toHaveBeenCalled();
    const userPrompt = vi.mocked(infraqStructuredJson).mock.calls[0]?.[1] as string;
    expect(userPrompt).toContain("12345678");
    expect(userPrompt).toContain("Bd. Test 1");
  });
});
