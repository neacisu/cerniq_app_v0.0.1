import { describe, it, expect } from "vitest";
import { buildKolFlowGraph } from "@/lib/etapa5-kol-graph.js";
import type { GraphKolProfileRow, GraphRelationshipRow } from "@/lib/etapa5-api.js";

function profile(
  p: Partial<GraphKolProfileRow> & Pick<GraphKolProfileRow, "clusterId" | "kolClientId">,
): GraphKolProfileRow {
  return {
    clusterName: null,
    modularityScore: "0.5",
    memberCount: 3,
    detectionMethod: "louvain",
    companyName: "Co",
    cui: null,
    judet: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...p,
  };
}

describe("buildKolFlowGraph", () => {
  it("builds node label with cluster line only when clusterName is set", () => {
    const profiles: GraphKolProfileRow[] = [
      profile({
        clusterId: "c1",
        kolClientId: "k1",
        companyName: "  Alpha  ",
        clusterName: "North",
        memberCount: 5,
        modularityScore: "0.42",
      }),
    ];
    const { nodes } = buildKolFlowGraph(profiles, []);
    const label = String((nodes[0]?.data as { label?: string }).label ?? "");
    expect(label).toContain("Alpha");
    expect(label).toContain("Cluster: North");
    expect(label).toContain("5 membri");
    expect(label).toContain("0.420");
  });

  it("omits cluster line when clusterName is null", () => {
    const profiles: GraphKolProfileRow[] = [
      profile({
        clusterId: "c1",
        kolClientId: "k1",
        companyName: null,
        clusterName: null,
        memberCount: 1,
        modularityScore: "0.1",
      }),
    ];
    const { nodes } = buildKolFlowGraph(profiles, []);
    const label = String((nodes[0]?.data as { label?: string }).label ?? "");
    expect(label).toContain("KOL");
    expect(label).not.toContain("Cluster:");
  });

  it("omits cluster line when clusterName is empty string", () => {
    const profiles: GraphKolProfileRow[] = [
      profile({
        clusterId: "c1",
        kolClientId: "k1",
        companyName: "X",
        clusterName: "",
        memberCount: 2,
        modularityScore: "0.2",
      }),
    ];
    const { nodes } = buildKolFlowGraph(profiles, []);
    const label = String((nodes[0]?.data as { label?: string }).label ?? "");
    expect(label).toContain("X");
    expect(label).not.toContain("Cluster:");
  });

  it("adds edge when relationship connects two distinct KOL clients", () => {
    const profiles: GraphKolProfileRow[] = [
      profile({ clusterId: "a", kolClientId: "k1", memberCount: 2 }),
      profile({ clusterId: "b", kolClientId: "k2", memberCount: 2 }),
    ];
    const rels: GraphRelationshipRow[] = [
      {
        id: "r1",
        tenantId: "t",
        entityAId: "k1",
        entityBId: "k2",
        relationType: "PEER",
        confidence: "0.9",
      },
    ];
    const { edges } = buildKolFlowGraph(profiles, rels);
    expect(edges.length).toBe(1);
    expect(edges[0]?.source).toBe("a");
    expect(edges[0]?.target).toBe("b");
  });
});
