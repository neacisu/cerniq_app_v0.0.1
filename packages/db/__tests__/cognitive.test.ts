/**
 * Schema cognitive — tabele și coloane critice (brain v2 / import graph).
 * Complementar cu migrațiile 0034/0036/0037.
 */
import { describe, it, expect } from "vitest";
import {
  cognitiveEvents,
  dataMutations,
  cognitiveNodeConfigs,
  importCognitiveNodes,
  importCognitiveEdges,
  cognitiveEdgeKindEnum,
  cognitiveApplyStatusEnum,
} from "../src/schemas/cognitive.js";

describe("Cognitive schema — cognitive_events", () => {
  it("are chei tenant, node, payload", () => {
    expect(cognitiveEvents.tenantId).toBeDefined();
    expect(cognitiveEvents.nodeKey).toBeDefined();
    expect(cognitiveEvents.payload).toBeDefined();
  });
});

describe("Cognitive schema — data_mutations", () => {
  it("include provenance trace/causation (0036)", () => {
    expect(dataMutations.traceId).toBeDefined();
    expect(dataMutations.causationId).toBeDefined();
    expect(dataMutations.batchId).toBeDefined();
  });
});

describe("Cognitive schema — cognitive_node_configs", () => {
  it("include apply lifecycle", () => {
    expect(cognitiveNodeConfigs.applyStatus).toBeDefined();
    expect(cognitiveNodeConfigs.appliedByWorkerInstance).toBeDefined();
  });
});

describe("Cognitive schema — import graph", () => {
  it("importCognitiveNodes are cognitiveType + swimlane + heartbeat", () => {
    expect(importCognitiveNodes.cognitiveType).toBeDefined();
    expect(importCognitiveNodes.swimlane).toBeDefined();
    expect(importCognitiveNodes.heartbeatAt).toBeDefined();
  });

  it("importCognitiveEdges leagă noduri cu edge_kind enum", () => {
    expect(importCognitiveEdges.sourceNodeKey).toBeDefined();
    expect(importCognitiveEdges.targetNodeKey).toBeDefined();
    expect(importCognitiveEdges.edgeKind).toBeDefined();
  });
});

describe("Cognitive enums export", () => {
  it("exportă enum-uri Drizzle pentru edge și apply", () => {
    expect(cognitiveEdgeKindEnum).toBeDefined();
    expect(cognitiveApplyStatusEnum).toBeDefined();
  });
});
