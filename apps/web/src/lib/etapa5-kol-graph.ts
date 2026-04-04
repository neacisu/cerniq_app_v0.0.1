/**
 * Construiește noduri/ muchii ReactFlow pentru KOL din `graph/kol-profiles` + `graph/relationships`.
 * Muchiile includ doar perechi unde ambele capete sunt `kolClientId` din profiluri.
 */
import type { CSSProperties } from "react";
import type { Edge, Node } from "@xyflow/react";
import type { GraphKolProfileRow, GraphRelationshipRow } from "./etapa5-api.js";

function nodeStyle(highlight: boolean): CSSProperties {
  if (highlight) {
    return {
      background: "color-mix(in oklch, var(--color-neuron-graph) 25%, transparent)",
      border: "2px solid var(--color-neuron-graph)",
      borderRadius: 8,
      color: "var(--color-t1)",
      fontSize: 10,
      fontWeight: 700,
      padding: "6px 10px",
      width: 150,
      textAlign: "center",
      boxShadow: "0 0 12px color-mix(in oklch, var(--color-neuron-graph) 50%, transparent)",
    };
  }
  return {
    background: "color-mix(in oklch, var(--color-neuron-social) 18%, transparent)",
    border: "1.5px solid var(--color-neuron-social)",
    borderRadius: 8,
    color: "var(--color-t1)",
    fontSize: 10,
    padding: "5px 8px",
    width: 140,
    textAlign: "center",
  };
}

export function buildKolFlowGraph(
  profiles: readonly GraphKolProfileRow[],
  relationships: readonly GraphRelationshipRow[],
): { nodes: Node[]; edges: Edge[]; profileByClusterId: Map<string, GraphKolProfileRow> } {
  const profileByClusterId = new Map(profiles.map((p) => [p.clusterId, p]));
  const kolClientToCluster = new Map(profiles.map((p) => [p.kolClientId, p.clusterId]));
  const n = profiles.length;

  const maxMembers = n > 0 ? Math.max(...profiles.map((q) => q.memberCount)) : 0;
  const nodes: Node[] = profiles.map((p, i) => {
    const angle = (2 * Math.PI * i) / Math.max(n, 1);
    const x = 220 + 200 * Math.cos(angle);
    const y = 220 + 200 * Math.sin(angle);
    const topMember = maxMembers > 0 && p.memberCount === maxMembers;
    const labelParts: string[] = [p.companyName?.trim() || "KOL"];
    const cn = p.clusterName;
    if (cn !== null && cn !== undefined && cn.length > 0) {
      labelParts.push(`Cluster: ${cn}`);
    }
    labelParts.push(`${p.memberCount} membri · modularity ${Number(p.modularityScore).toFixed(3)}`);
    return {
      id: p.clusterId,
      position: { x, y },
      data: { label: labelParts.join("\n") },
      style: nodeStyle(topMember),
    };
  });

  const edgeKeys = new Set<string>();
  const edges: Edge[] = [];

  for (const rel of relationships) {
    const ca = kolClientToCluster.get(rel.entityAId);
    const cb = kolClientToCluster.get(rel.entityBId);
    if (!ca || !cb || ca === cb) continue;
    const pair = ca < cb ? `${ca}|${cb}` : `${cb}|${ca}`;
    const ek = `${pair}|${rel.relationType}`;
    if (edgeKeys.has(ek)) continue;
    edgeKeys.add(ek);
    edges.push({
      id: ek,
      source: ca,
      target: cb,
      style: { stroke: "var(--color-neuron-social)", strokeWidth: 1.2 },
      animated: rel.relationType === "RECOMMENDED_BY",
    });
  }

  return { nodes, edges, profileByClusterId };
}
