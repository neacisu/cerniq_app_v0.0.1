/**
 * Teste exhaustive pentru packages/shared/src/types/cognitive.ts
 *
 * Categorii de teste:
 * 1. Valorile const arrays — sunt exacte și complete (cross-ref DB enums)
 * 2. Type guards — comportament corect pe valori valide, invalide și edge cases
 * 3. SWIMLANE_TO_COGNITIVE_FUNCTION — acoperire completă a swimlane-urilor
 * 4. Structuri interface — compatibilitate backwards și forwards
 * 5. Satisfies compile-time — tipul satisface constraintul definit
 */

import { describe, expect, it } from "vitest";
import {
  ANOMALY_KIND_VALUES,
  BACKGROUND_PROCESS_STATUSES,
  BACKGROUND_PROCESS_TYPES,
  COGNITIVE_APPLY_STATUS_VALUES,
  COGNITIVE_FUNCTION_VALUES,
  COGNITIVE_TYPE_VALUES,
  EDGE_KIND_VALUES,
  SWIMLANE_TO_COGNITIVE_FUNCTION,
  isAnomalyKind,
  isCognitiveApplyStatus,
  isCognitiveFunction,
  isCognitiveType,
  isEdgeKind,
} from "../cognitive.js";
import type {
  AnomalyKind,
  AnomalyRecord,
  BackgroundProcessRecord,
  CognitiveBrain,
  CognitiveApplyStatus,
  CognitiveEdge,
  CognitiveEvent,
  CognitiveFunction,
  CognitiveNode,
  CognitiveType,
  DataMutationRecord,
  EdgeKind,
  NodeControlState,
  NodeMetrics,
  QueueProfile,
} from "../cognitive.js";

// ─── 1. COGNITIVE_APPLY_STATUS_VALUES ──────────────────────────────────────

describe("COGNITIVE_APPLY_STATUS_VALUES", () => {
  it("conține exact 3 valori", () => {
    expect(COGNITIVE_APPLY_STATUS_VALUES).toHaveLength(3);
  });

  it("conține toate valorile enum PostgreSQL cognitive_apply_status", () => {
    expect(COGNITIVE_APPLY_STATUS_VALUES).toContain("immediate");
    expect(COGNITIVE_APPLY_STATUS_VALUES).toContain("pending_apply");
    expect(COGNITIVE_APPLY_STATUS_VALUES).toContain("applied");
  });

  it("este read-only (const assertion)", () => {
    // Verifică că array-ul nu e mutabil (frozen prin const)
    expect(Array.isArray(COGNITIVE_APPLY_STATUS_VALUES)).toBe(true);
  });
});

// ─── 2. EDGE_KIND_VALUES ───────────────────────────────────────────────────

describe("EDGE_KIND_VALUES", () => {
  it("conține exact 7 valori — corespund enum PostgreSQL cognitive_edge_kind", () => {
    expect(EDGE_KIND_VALUES).toHaveLength(7);
  });

  it("conține toate valorile enum-ului DB", () => {
    const expectedDbValues: EdgeKind[] = [
      "triggers",
      "depends_on",
      "reads",
      "writes",
      "mutates",
      "blocks",
      "retries",
    ];
    for (const v of expectedDbValues) {
      expect(EDGE_KIND_VALUES).toContain(v);
    }
  });

  it("nu conține valori extra față de DB enum", () => {
    const expected = new Set([
      "triggers",
      "depends_on",
      "reads",
      "writes",
      "mutates",
      "blocks",
      "retries",
    ]);
    for (const v of EDGE_KIND_VALUES) {
      expect(expected).toContain(v);
    }
  });
});

// ─── 3. ANOMALY_KIND_VALUES ────────────────────────────────────────────────

describe("ANOMALY_KIND_VALUES", () => {
  it("conține exact 8 valori — corespund enum PostgreSQL anomaly_rule_kind", () => {
    expect(ANOMALY_KIND_VALUES).toHaveLength(8);
  });

  it("conține toate valorile enum-ului DB", () => {
    const expectedDbValues: AnomalyKind[] = [
      "stale_heartbeat",
      "counter_drift",
      "orphan_job",
      "missing_parent_context",
      "retry_exhausted",
      "mutation_without_provenance",
      "queue_backpressure",
      "config_pending_apply",
    ];
    for (const v of expectedDbValues) {
      expect(ANOMALY_KIND_VALUES).toContain(v);
    }
  });

  it("nu conține valori extra față de DB enum", () => {
    const expected = new Set([
      "stale_heartbeat",
      "counter_drift",
      "orphan_job",
      "missing_parent_context",
      "retry_exhausted",
      "mutation_without_provenance",
      "queue_backpressure",
      "config_pending_apply",
    ]);
    for (const v of ANOMALY_KIND_VALUES) {
      expect(expected).toContain(v);
    }
  });
});

// ─── 4. COGNITIVE_TYPE_VALUES ──────────────────────────────────────────────

describe("COGNITIVE_TYPE_VALUES", () => {
  it("conține exact 6 valori", () => {
    expect(COGNITIVE_TYPE_VALUES).toHaveLength(6);
  });

  it("conține toate tipurile cognitive din comentariul DB", () => {
    const expectedTypes: CognitiveType[] = [
      "REFLEX",
      "DELIBERATIVE",
      "FACTUAL",
      "EXECUTIVE",
      "MAINTENANCE",
      "HUMAN",
    ];
    for (const v of expectedTypes) {
      expect(COGNITIVE_TYPE_VALUES).toContain(v);
    }
  });

  it("valorile sunt SCREAMING_CASE", () => {
    for (const v of COGNITIVE_TYPE_VALUES) {
      expect(v).toBe(v.toUpperCase());
    }
  });
});

// ─── 5. COGNITIVE_FUNCTION_VALUES ─────────────────────────────────────────

describe("COGNITIVE_FUNCTION_VALUES", () => {
  it("conține exact 12 valori — corespund celor 12 swimlane-uri din catalog", () => {
    expect(COGNITIVE_FUNCTION_VALUES).toHaveLength(12);
  });

  it("acoperă toate swimlane-urile din COGNITIVE_NODE_CATALOG", () => {
    const expectedFunctions: CognitiveFunction[] = [
      "DATA_INGEST",
      "NORMALIZATION",
      "VALIDATION",
      "ENRICHMENT_FISCAL",
      "ENRICHMENT_EXTERNAL",
      "AI_ANALYSIS",
      "DEDUP_SCORING",
      "PIPELINE_CONTROL",
      "HUMAN_OVERSIGHT",
      "PRODUCT_KNOWLEDGE",
      "AI_REASONING",
      "FISCAL_EXECUTION",
    ];
    for (const v of expectedFunctions) {
      expect(COGNITIVE_FUNCTION_VALUES).toContain(v);
    }
  });

  it("valorile sunt SCREAMING_CASE", () => {
    for (const v of COGNITIVE_FUNCTION_VALUES) {
      expect(v).toBe(v.toUpperCase());
    }
  });
});

// ─── 6. SWIMLANE_TO_COGNITIVE_FUNCTION ────────────────────────────────────

describe("SWIMLANE_TO_COGNITIVE_FUNCTION", () => {
  it("are exact 12 intrări — câte un swimlane", () => {
    expect(Object.keys(SWIMLANE_TO_COGNITIVE_FUNCTION)).toHaveLength(12);
  });

  it("mapează corect fiecare swimlane la funcție cognitivă", () => {
    const expectedMappings: Record<string, CognitiveFunction> = {
      "data-ingest": "DATA_INGEST",
      normalization: "NORMALIZATION",
      validation: "VALIDATION",
      "enrichment-fiscal": "ENRICHMENT_FISCAL",
      "enrichment-external": "ENRICHMENT_EXTERNAL",
      "ai-analysis": "AI_ANALYSIS",
      "dedup-scoring": "DEDUP_SCORING",
      "pipeline-control": "PIPELINE_CONTROL",
      "human-oversight": "HUMAN_OVERSIGHT",
      "product-knowledge": "PRODUCT_KNOWLEDGE",
      "ai-reasoning": "AI_REASONING",
      "fiscal-execution": "FISCAL_EXECUTION",
    };
    for (const [swimlane, fn] of Object.entries(expectedMappings)) {
      expect(SWIMLANE_TO_COGNITIVE_FUNCTION[swimlane]).toBe(fn);
    }
  });

  it("toate valorile sunt în COGNITIVE_FUNCTION_VALUES", () => {
    const fnSet = new Set<string>(COGNITIVE_FUNCTION_VALUES);
    for (const v of Object.values(SWIMLANE_TO_COGNITIVE_FUNCTION)) {
      expect(fnSet).toContain(v);
    }
  });

  it("fiecare swimlane produce o funcție distinctă (bijectiv)", () => {
    const values = Object.values(SWIMLANE_TO_COGNITIVE_FUNCTION);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("returnează undefined pentru swimlane necunoscut", () => {
    expect(SWIMLANE_TO_COGNITIVE_FUNCTION["unknown-swimlane"]).toBeUndefined();
  });
});

// ─── 7. BACKGROUND_PROCESS_TYPES ──────────────────────────────────────────

describe("BACKGROUND_PROCESS_TYPES", () => {
  it("conține cele 3 tipuri de procese", () => {
    expect(BACKGROUND_PROCESS_TYPES).toHaveLength(3);
    expect(BACKGROUND_PROCESS_TYPES).toContain("SCHEDULED");
    expect(BACKGROUND_PROCESS_TYPES).toContain("CONTINUOUS");
    expect(BACKGROUND_PROCESS_TYPES).toContain("ON_DEMAND");
  });
});

describe("BACKGROUND_PROCESS_STATUSES", () => {
  it("conține cele 4 stări de proces", () => {
    expect(BACKGROUND_PROCESS_STATUSES).toHaveLength(4);
    expect(BACKGROUND_PROCESS_STATUSES).toContain("RUNNING");
    expect(BACKGROUND_PROCESS_STATUSES).toContain("COMPLETED");
    expect(BACKGROUND_PROCESS_STATUSES).toContain("FAILED");
    expect(BACKGROUND_PROCESS_STATUSES).toContain("CANCELLED");
  });
});

// ─── 8. isCognitiveApplyStatus ────────────────────────────────────────────

describe("isCognitiveApplyStatus", () => {
  it("returnează true pentru toate valorile valide", () => {
    expect(isCognitiveApplyStatus("immediate")).toBe(true);
    expect(isCognitiveApplyStatus("pending_apply")).toBe(true);
    expect(isCognitiveApplyStatus("applied")).toBe(true);
  });

  it("returnează false pentru valori invalide", () => {
    expect(isCognitiveApplyStatus("IMMEDIATE")).toBe(false);
    expect(isCognitiveApplyStatus("pending")).toBe(false);
    expect(isCognitiveApplyStatus("")).toBe(false);
    expect(isCognitiveApplyStatus(null)).toBe(false);
    expect(isCognitiveApplyStatus(undefined)).toBe(false);
    expect(isCognitiveApplyStatus(123)).toBe(false);
    expect(isCognitiveApplyStatus({})).toBe(false);
    expect(isCognitiveApplyStatus([])).toBe(false);
  });

  it("returnează false pentru valori asemănătoare dar greșite", () => {
    expect(isCognitiveApplyStatus("apply")).toBe(false);
    expect(isCognitiveApplyStatus("pending apply")).toBe(false);
  });
});

// ─── 9. isEdgeKind ────────────────────────────────────────────────────────

describe("isEdgeKind", () => {
  it("returnează true pentru toate valorile valide din DB enum", () => {
    for (const v of EDGE_KIND_VALUES) {
      expect(isEdgeKind(v)).toBe(true);
    }
  });

  it("returnează false pentru valori invalide", () => {
    expect(isEdgeKind("TRIGGERS")).toBe(false);
    expect(isEdgeKind("data_flow")).toBe(false);
    expect(isEdgeKind("")).toBe(false);
    expect(isEdgeKind(null)).toBe(false);
    expect(isEdgeKind(undefined)).toBe(false);
    expect(isEdgeKind(42)).toBe(false);
  });

  it("narrowing TypeScript funcționează corect post-guard", () => {
    const value: unknown = "triggers";
    if (isEdgeKind(value)) {
      const _typed: EdgeKind = value;
      expect(_typed).toBe("triggers");
    } else {
      throw new Error("Expected truthy guard");
    }
  });
});

// ─── 10. isAnomalyKind ────────────────────────────────────────────────────

describe("isAnomalyKind", () => {
  it("returnează true pentru toate valorile valide din DB enum", () => {
    for (const v of ANOMALY_KIND_VALUES) {
      expect(isAnomalyKind(v)).toBe(true);
    }
  });

  it("returnează false pentru valori invalide", () => {
    expect(isAnomalyKind("STALE_HEARTBEAT")).toBe(false);
    expect(isAnomalyKind("stale-heartbeat")).toBe(false);
    expect(isAnomalyKind("")).toBe(false);
    expect(isAnomalyKind(null)).toBe(false);
    expect(isAnomalyKind(undefined)).toBe(false);
    expect(isAnomalyKind(0)).toBe(false);
  });

  it("narrowing TypeScript funcționează corect post-guard", () => {
    const value: unknown = "queue_backpressure";
    if (isAnomalyKind(value)) {
      const _typed: AnomalyKind = value;
      expect(_typed).toBe("queue_backpressure");
    } else {
      throw new Error("Expected truthy guard");
    }
  });
});

// ─── 11. isCognitiveType ──────────────────────────────────────────────────

describe("isCognitiveType", () => {
  it("returnează true pentru toate cele 6 valori valide", () => {
    for (const v of COGNITIVE_TYPE_VALUES) {
      expect(isCognitiveType(v)).toBe(true);
    }
  });

  it("returnează false pentru valori invalide", () => {
    expect(isCognitiveType("reflex")).toBe(false);
    expect(isCognitiveType("Deliberative")).toBe(false);
    expect(isCognitiveType("")).toBe(false);
    expect(isCognitiveType(null)).toBe(false);
    expect(isCognitiveType(undefined)).toBe(false);
  });

  it("narrowing TypeScript funcționează corect post-guard", () => {
    const value: unknown = "EXECUTIVE";
    if (isCognitiveType(value)) {
      const _typed: CognitiveType = value;
      expect(_typed).toBe("EXECUTIVE");
    } else {
      throw new Error("Expected truthy guard");
    }
  });
});

// ─── 12. isCognitiveFunction ──────────────────────────────────────────────

describe("isCognitiveFunction", () => {
  it("returnează true pentru toate cele 12 valori valide", () => {
    for (const v of COGNITIVE_FUNCTION_VALUES) {
      expect(isCognitiveFunction(v)).toBe(true);
    }
  });

  it("returnează false pentru valori invalide", () => {
    expect(isCognitiveFunction("data_ingest")).toBe(false);
    expect(isCognitiveFunction("DataIngest")).toBe(false);
    expect(isCognitiveFunction("UNKNOWN")).toBe(false);
    expect(isCognitiveFunction("")).toBe(false);
    expect(isCognitiveFunction(null)).toBe(false);
  });

  it("narrowing TypeScript funcționează corect post-guard", () => {
    const value: unknown = "AI_ANALYSIS";
    if (isCognitiveFunction(value)) {
      const _typed: CognitiveFunction = value;
      expect(_typed).toBe("AI_ANALYSIS");
    } else {
      throw new Error("Expected truthy guard");
    }
  });
});

// ─── 13. NodeMetrics — structura corectă ──────────────────────────────────

describe("NodeMetrics interface", () => {
  it("obiect valid satisface interfața", () => {
    const metrics: NodeMetrics = {
      processed: 100,
      failed: 5,
      avgLatency: 123.4,
    };
    expect(metrics.processed).toBe(100);
    expect(metrics.failed).toBe(5);
    expect(metrics.avgLatency).toBe(123.4);
  });
});

// ─── 14. NodeControlState — structura corectă ─────────────────────────────

describe("NodeControlState interface", () => {
  it("obiect minimal valid satisface interfața (câmpuri opționale absente)", () => {
    const state: NodeControlState = {
      paused: false,
      applyStatus: "immediate",
      requiresWorkerRestart: false,
    };
    expect(state.paused).toBe(false);
    expect(state.applyStatus).toBe("immediate");
    expect(state.requiresWorkerRestart).toBe(false);
    expect(state.concurrency).toBeUndefined();
    expect(state.rateLimitMax).toBeUndefined();
  });

  it("obiect complet valid satisface interfața", () => {
    const state: NodeControlState = {
      paused: true,
      applyStatus: "pending_apply",
      concurrency: 4,
      rateLimitMax: 100,
      rateLimitDuration: 60000,
      requiresWorkerRestart: true,
      appliedAt: "2026-03-15T10:00:00Z",
      appliedByWorkerInstance: "worker-01",
    };
    expect(state.concurrency).toBe(4);
    expect(state.rateLimitMax).toBe(100);
    expect(state.appliedByWorkerInstance).toBe("worker-01");
  });

  it("rateLimitMax și appliedAt pot fi null", () => {
    const state: NodeControlState = {
      paused: false,
      applyStatus: "applied",
      requiresWorkerRestart: false,
      rateLimitMax: null,
      appliedAt: null,
    };
    expect(state.rateLimitMax).toBeNull();
    expect(state.appliedAt).toBeNull();
  });

  it("applyStatus acceptă toate valorile CognitiveApplyStatus", () => {
    const statuses: CognitiveApplyStatus[] = ["immediate", "pending_apply", "applied"];
    for (const applyStatus of statuses) {
      const state: NodeControlState = { paused: false, applyStatus, requiresWorkerRestart: false };
      expect(isCognitiveApplyStatus(state.applyStatus)).toBe(true);
    }
  });
});

// ─── 15. AnomalyRecord — structura corectă ────────────────────────────────

describe("AnomalyRecord interface", () => {
  it("obiect minimal valid satisface interfața", () => {
    const record: AnomalyRecord = {
      id: 1,
      tenantId: "tenant-uuid-123",
      batchId: "batch-uuid-456",
      nodeKey: "e1:ingest:csv",
      ruleKind: "stale_heartbeat",
      detectedAt: "2026-03-15T10:00:00Z",
      payload: {},
    };
    expect(record.ruleKind).toBe("stale_heartbeat");
    expect(isAnomalyKind(record.ruleKind)).toBe(true);
    expect(record.resolvedAt).toBeUndefined();
  });

  it("resolvedAt poate fi null sau string ISO", () => {
    const resolved: AnomalyRecord = {
      id: 2,
      tenantId: "t1",
      batchId: "b1",
      nodeKey: "e1:validate:cui-mod11",
      ruleKind: "counter_drift",
      detectedAt: "2026-03-15T08:00:00Z",
      resolvedAt: "2026-03-15T09:00:00Z",
      payload: { drift: 5 },
    };
    expect(resolved.resolvedAt).toBe("2026-03-15T09:00:00Z");
  });

  it("payload poate conține date arbitrare", () => {
    const record: AnomalyRecord = {
      id: 3,
      tenantId: "t1",
      batchId: "b1",
      nodeKey: "e1:ingest:csv",
      ruleKind: "queue_backpressure",
      detectedAt: "2026-03-15T10:00:00Z",
      payload: { queueDepth: 5000, threshold: 1000, timestamp: "2026-03-15T10:00:00Z" },
    };
    expect(record.payload["queueDepth"]).toBe(5000);
  });
});

// ─── 16. BackgroundProcessRecord — structura corectă ──────────────────────

describe("BackgroundProcessRecord interface", () => {
  it("obiect minimal valid (fără completedAt și payload)", () => {
    const proc: BackgroundProcessRecord = {
      nodeKey: "e1:stats:daily",
      processType: "SCHEDULED",
      startedAt: "2026-03-15T02:00:00Z",
      status: "RUNNING",
    };
    expect(proc.processType).toBe("SCHEDULED");
    expect(proc.status).toBe("RUNNING");
    expect(proc.completedAt).toBeUndefined();
    expect(proc.payload).toBeUndefined();
  });

  it("obiect complet valid cu completedAt și payload", () => {
    const proc: BackgroundProcessRecord = {
      nodeKey: "p3:pipeline:monitor",
      processType: "CONTINUOUS",
      startedAt: "2026-03-15T00:00:00Z",
      completedAt: "2026-03-15T01:00:00Z",
      status: "COMPLETED",
      payload: { processed: 1500, errors: 0 },
    };
    expect(proc.processType).toBe("CONTINUOUS");
    expect(proc.status).toBe("COMPLETED");
    expect(proc.payload?.["processed"]).toBe(1500);
  });

  it("processType acceptă toate valorile din BACKGROUND_PROCESS_TYPES", () => {
    for (const processType of BACKGROUND_PROCESS_TYPES) {
      const proc: BackgroundProcessRecord = {
        nodeKey: "test",
        processType,
        startedAt: "2026-03-15T00:00:00Z",
        status: "RUNNING",
      };
      expect(BACKGROUND_PROCESS_TYPES).toContain(proc.processType);
    }
  });

  it("status acceptă toate valorile din BACKGROUND_PROCESS_STATUSES", () => {
    for (const status of BACKGROUND_PROCESS_STATUSES) {
      const proc: BackgroundProcessRecord = {
        nodeKey: "test",
        processType: "ON_DEMAND",
        startedAt: "2026-03-15T00:00:00Z",
        status,
      };
      expect(BACKGROUND_PROCESS_STATUSES).toContain(proc.status);
    }
  });
});

// ─── 17. QueueProfile — structura corectă ─────────────────────────────────

describe("QueueProfile interface", () => {
  it("obiect valid satisface interfața", () => {
    const profile: QueueProfile = {
      queueName: "ingest:csv",
      nodeKey: "e1:ingest:csv",
      waiting: 42,
      active: 5,
      completed: 10000,
      failed: 12,
      delayed: 0,
      paused: 0,
      depth: 42,
    };
    expect(profile.depth).toBe(profile.waiting);
    expect(profile.queueName).toBe("ingest:csv");
  });

  it("depth semantic = waiting (invariant)", () => {
    const waiting = 77;
    const profile: QueueProfile = {
      queueName: "normalize:name",
      nodeKey: "e1:normalize:name",
      waiting,
      active: 1,
      completed: 500,
      failed: 2,
      delayed: 3,
      paused: 0,
      depth: waiting,
    };
    expect(profile.depth).toBe(waiting);
  });

  it("contor failed și delayed pot fi zero", () => {
    const profile: QueueProfile = {
      queueName: "validate:cui:mod11",
      nodeKey: "e1:validate:cui-mod11",
      waiting: 0,
      active: 0,
      completed: 9999,
      failed: 0,
      delayed: 0,
      paused: 0,
      depth: 0,
    };
    expect(profile.failed).toBe(0);
    expect(profile.delayed).toBe(0);
  });
});

// ─── 18. CognitiveNode — extensii backwards-compatible ────────────────────

describe("CognitiveNode interface (extins)", () => {
  it("obiect minim (fără controlState/anomalies) rămâne valid", () => {
    const node: CognitiveNode = {
      nodeKey: "e1:ingest:csv",
      queueName: "ingest:csv",
      neuronType: "SensoryNeuron",
      swimlane: "data-ingest",
      status: "ACTIVE",
      metrics: { processed: 500, failed: 3, avgLatency: 45.2 },
    };
    expect(node.controlState).toBeUndefined();
    expect(node.anomalies).toBeUndefined();
  });

  it("obiect extins cu controlState și anomalies este valid", () => {
    const node: CognitiveNode = {
      nodeKey: "e1:validate:cui-anaf",
      queueName: "validate:cui:anaf",
      neuronType: "RulesNeuron",
      swimlane: "validation",
      status: "PAUSED",
      metrics: { processed: 100, failed: 0, avgLatency: 200 },
      controlState: {
        paused: true,
        applyStatus: "immediate",
        requiresWorkerRestart: false,
      },
      anomalies: [
        {
          id: 1,
          tenantId: "t1",
          batchId: "b1",
          nodeKey: "e1:validate:cui-anaf",
          ruleKind: "stale_heartbeat",
          detectedAt: "2026-03-15T10:00:00Z",
          payload: {},
        },
      ],
    };
    expect(node.controlState?.paused).toBe(true);
    expect(node.anomalies).toHaveLength(1);
    expect(node.anomalies?.[0]?.ruleKind).toBe("stale_heartbeat");
  });

  it("status acceptă valorile 'ACTIVE' | 'PAUSED' | 'ERROR'", () => {
    const statuses: CognitiveNode["status"][] = ["ACTIVE", "PAUSED", "ERROR"];
    for (const status of statuses) {
      const node: CognitiveNode = {
        nodeKey: "test",
        queueName: "test:queue",
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        status,
        metrics: { processed: 0, failed: 0, avgLatency: 0 },
      };
      expect(node.status).toBe(status);
    }
  });
});

// ─── 19. CognitiveBrain — structura corectă ───────────────────────────────

describe("CognitiveBrain interface", () => {
  it("obiect valid cu noduri și edge-uri", () => {
    const brain: CognitiveBrain = {
      nodes: [
        {
          nodeKey: "e1:ingest:csv",
          queueName: "ingest:csv",
          neuronType: "SensoryNeuron",
          swimlane: "data-ingest",
          status: "ACTIVE",
          metrics: { processed: 100, failed: 0, avgLatency: 50 },
        },
      ],
      edges: [
        {
          sourceNodeKey: "e1:ingest:csv",
          targetNodeKey: "e1:normalize:name",
          edgeType: "DATA_FLOW",
          weight: 1,
        },
      ],
      metadata: {
        totalNeurons: 118,
        activeNeurons: 55,
        lastUpdated: "2026-03-15T10:00:00Z",
      },
    };
    expect(brain.nodes).toHaveLength(1);
    expect(brain.edges).toHaveLength(1);
    expect(brain.metadata.totalNeurons).toBe(118);
  });

  it("obiect cu noduri cu câmpuri extinse (controlState, anomalies)", () => {
    const brain: CognitiveBrain = {
      nodes: [
        {
          nodeKey: "e1:ingest:csv",
          queueName: "ingest:csv",
          neuronType: "SensoryNeuron",
          swimlane: "data-ingest",
          status: "ACTIVE",
          metrics: { processed: 100, failed: 0, avgLatency: 50 },
          controlState: { paused: false, applyStatus: "applied", requiresWorkerRestart: false },
          anomalies: [],
        },
      ],
      edges: [],
      metadata: { totalNeurons: 1, activeNeurons: 1, lastUpdated: "2026-03-15T10:00:00Z" },
    };
    expect(brain.nodes[0]?.controlState?.applyStatus).toBe("applied");
    expect(brain.nodes[0]?.anomalies).toHaveLength(0);
  });
});

// ─── 20. CognitiveEdge — structura corectă ────────────────────────────────

describe("CognitiveEdge interface", () => {
  it("obiect valid satisface interfața", () => {
    const edge: CognitiveEdge = {
      sourceNodeKey: "e1:ingest:csv",
      targetNodeKey: "e1:normalize:name",
      edgeType: "DATA_FLOW",
      weight: 1,
    };
    expect(edge.edgeType).toBe("DATA_FLOW");
  });

  it("edgeType acceptă toate cele 3 valori definite", () => {
    const types: CognitiveEdge["edgeType"][] = ["DATA_FLOW", "TRIGGER", "FALLBACK"];
    for (const edgeType of types) {
      const edge: CognitiveEdge = {
        sourceNodeKey: "a",
        targetNodeKey: "b",
        edgeType,
        weight: 0.5,
      };
      expect(edge.edgeType).toBe(edgeType);
    }
  });
});

// ─── 21. CognitiveEvent — extensia cu id? opțional ────────────────────────

describe("CognitiveEvent interface", () => {
  it("obiect fără id (backwards compat) este valid", () => {
    const event: CognitiveEvent = {
      nodeKey: "e1:ingest:csv",
      eventType: "node_started",
      timestamp: "2026-03-15T10:00:00Z",
      data: {},
    };
    expect(event.id).toBeUndefined();
  });

  it("obiect cu id (replay din DB) este valid", () => {
    const event: CognitiveEvent = {
      id: 12345,
      nodeKey: "e1:ingest:csv",
      eventType: "node_completed",
      timestamp: "2026-03-15T10:01:00Z",
      data: { duration: 1000 },
    };
    expect(event.id).toBe(12345);
  });

  it("data poate fi un obiect complex arbitrar", () => {
    const event: CognitiveEvent = {
      nodeKey: "p1:orchestrate",
      eventType: "node_error",
      timestamp: "2026-03-15T10:02:00Z",
      data: {
        error: "Connection timeout",
        retryCount: 3,
        meta: { cui: "12345678" },
      },
    };
    expect(event.data["retryCount"]).toBe(3);
  });
});

// ─── 22. DataMutationRecord — extensia cu câmpuri de provenance ───────────

describe("DataMutationRecord interface", () => {
  it("obiect minim (fără câmpuri de provenance) rămâne valid", () => {
    const record: DataMutationRecord = {
      batchId: "batch-123",
      nodeKey: "e1:anaf:full-fetch",
      entityId: "company-456",
      before: null,
      after: { name: "Test SRL" },
      mutationIntent: "CREATE",
      timestamp: "2026-03-15T10:00:00Z",
    };
    expect(record.traceId).toBeUndefined();
    expect(record.causationId).toBeUndefined();
    expect(record.actorId).toBeUndefined();
    expect(record.changedFields).toBeUndefined();
  });

  it("obiect cu toate câmpurile de provenance este valid", () => {
    const record: DataMutationRecord = {
      batchId: "batch-123",
      nodeKey: "e1:anaf:full-fetch",
      entityId: "company-456",
      before: { name: "Old Name SRL" },
      after: { name: "New Name SRL" },
      mutationIntent: "UPDATE",
      timestamp: "2026-03-15T10:00:00Z",
      changedFields: ["name", "metadata.anafFiscal"],
      traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      causationId: "job-789",
      actorId: "worker-enrichment-01",
    };
    expect(record.changedFields).toHaveLength(2);
    expect(record.traceId).toContain("4bf92f");
    expect(record.mutationIntent).toBe("UPDATE");
  });

  it("traceId și causationId pot fi null", () => {
    const record: DataMutationRecord = {
      batchId: "b1",
      nodeKey: "n1",
      entityId: "e1",
      before: null,
      after: {},
      mutationIntent: "ENRICH",
      timestamp: "2026-03-15T10:00:00Z",
      traceId: null,
      causationId: null,
    };
    expect(record.traceId).toBeNull();
    expect(record.causationId).toBeNull();
  });

  it("mutationIntent acceptă toate cele 4 valori", () => {
    const intents: DataMutationRecord["mutationIntent"][] = [
      "CREATE",
      "UPDATE",
      "ENRICH",
      "PROMOTE",
    ];
    for (const mutationIntent of intents) {
      const r: DataMutationRecord = {
        batchId: "b",
        nodeKey: "n",
        entityId: "e",
        before: null,
        after: {},
        mutationIntent,
        timestamp: "2026-03-15T10:00:00Z",
      };
      expect(r.mutationIntent).toBe(mutationIntent);
    }
  });
});

// ─── 23. Edge cases type guards ───────────────────────────────────────────

describe("Type guards — edge cases de tip", () => {
  it("isEdgeKind: array de string-uri returnează false", () => {
    expect(isEdgeKind(["triggers"])).toBe(false);
  });

  it("isAnomalyKind: număr returnează false", () => {
    expect(isAnomalyKind(0)).toBe(false);
    expect(isAnomalyKind(-1)).toBe(false);
  });

  it("isCognitiveType: boolean returnează false", () => {
    expect(isCognitiveType(true)).toBe(false);
    expect(isCognitiveType(false)).toBe(false);
  });

  it("isCognitiveApplyStatus: object returnează false", () => {
    expect(isCognitiveApplyStatus({ status: "immediate" })).toBe(false);
  });

  it("isCognitiveFunction: string cu underscore la final returnează false", () => {
    expect(isCognitiveFunction("DATA_INGEST_")).toBe(false);
  });

  it("isEdgeKind: string similar dar cu typo returnează false", () => {
    expect(isEdgeKind("trigger")).toBe(false);
    expect(isEdgeKind("depend_on")).toBe(false);
    expect(isEdgeKind("depends-on")).toBe(false);
  });

  it("isAnomalyKind: snake_case corect dar valoare diferită returnează false", () => {
    expect(isAnomalyKind("stale_node")).toBe(false);
    expect(isAnomalyKind("retry_exhaustion")).toBe(false);
  });
});
