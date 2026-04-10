import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.js";
import { buildKolFlowGraph } from "@/lib/etapa5-kol-graph.js";
import type { GraphKolProfileRow, GraphRelationshipRow } from "@/lib/etapa5-api.js";

function KolGraphDetailPanel({
  profile,
  onClose,
}: {
  readonly profile: GraphKolProfileRow;
  readonly onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
        width: 240,
        background: "var(--color-s900)",
        border: "1px solid var(--color-s700)",
        borderRadius: 8,
        padding: 14,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-t1)" }}>
            {profile.companyName?.trim() || "KOL"}
          </div>
          <div style={{ fontSize: 9, color: "var(--color-t3)", marginTop: 4 }}>
            Cluster: {profile.clusterName ?? "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-t3)",
            cursor: "pointer",
          }}
          aria-label="Închide"
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Membri cluster</span>
          <span style={{ color: "var(--color-neuron-graph)", fontWeight: 700 }}>
            {profile.memberCount}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>Modularity</span>
          <span style={{ color: "var(--color-t1)" }}>
            {Number(profile.modularityScore).toFixed(4)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--color-t4)" }}>CUI</span>
          <span style={{ color: "var(--color-t2)" }}>{profile.cui ?? "—"}</span>
        </div>
        <Button
          size="sm"
          style={{ marginTop: 6, fontSize: 10, gap: 4 }}
          variant="outline"
          onClick={() => {
            toast.info(
              "Recompensele referral se gestionează din Referral Manager / API — fără acțiune directă KOL aici.",
            );
          }}
        >
          Ghid recompense
        </Button>
      </div>
    </div>
  );
}

export type KolGraphProps = {
  readonly isLoading: boolean;
  readonly profiles: readonly GraphKolProfileRow[];
  readonly relationships: readonly GraphRelationshipRow[];
  readonly height?: number;
  readonly selectedId: string | null;
  readonly onToggleNodeId: (nodeId: string) => void;
  readonly onClosePanel: () => void;
};

/**
 * Graf KOL (React Flow): mărime nod ~ influență (membri cluster vs max în eșantion).
 */
export function KolGraph({
  isLoading,
  profiles,
  relationships,
  height = 340,
  selectedId,
  onToggleNodeId,
  onClosePanel,
}: KolGraphProps) {
  const { nodes, edges, profileByClusterId } = useMemo(() => {
    if (profiles.length === 0) {
      const emptyNodes: Node[] = [];
      const emptyEdges: Edge[] = [];
      return {
        nodes: emptyNodes,
        edges: emptyEdges,
        profileByClusterId: new Map<string, GraphKolProfileRow>(),
      };
    }
    return buildKolFlowGraph(profiles, relationships);
  }, [profiles, relationships]);

  const selectedProfile = selectedId ? profileByClusterId.get(selectedId) : undefined;

  if (isLoading) {
    return <div className="p-4 text-sm text-t3">Se încarcă…</div>;
  }
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-sm text-t3">
        Fără noduri KOL — rulați detecția graph E5 sau verificați filtrele API.
      </div>
    );
  }

  return (
    <div style={{ height, position: "relative" }}>
      {selectedProfile ? (
        <KolGraphDetailPanel profile={selectedProfile} onClose={onClosePanel} />
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => onToggleNodeId(node.id)}
        fitView
        attributionPosition="bottom-left"
        colorMode="dark"
        style={{ background: "var(--color-s950)", borderRadius: "0 0 8px 8px" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-s700)" />
        <Controls
          style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
        />
        <MiniMap
          nodeColor={() => "var(--color-neuron-graph)"}
          style={{ background: "var(--color-s800)", border: "1px solid var(--color-s700)" }}
        />
      </ReactFlow>
    </div>
  );
}
