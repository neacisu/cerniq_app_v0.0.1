import "@xyflow/react/dist/style.css";

import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  BackgroundVariant,
  Panel,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type EdgeTypes,
  type Viewport,
} from "@xyflow/react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import {
  COGNITIVE_NODE_CATALOG,
  SWIMLANES,
  type CognitiveNode,
  type CognitiveEdge,
  type CognitiveEvent,
} from "@cerniq/shared";
import {
  useCognitiveBrain,
  useCognitiveEventStream,
  useCognitiveLOD,
} from "@/hooks/use-cognitive-brain.js";
import { voidAsyncHandler } from "@/lib/void-async-handlers.js";
import { NeuronNodeComponent, type NeuronNodeType } from "./NeuronNode.js";
import { NEURON_COLORS } from "./neuron-tokens.js";
import { QueueSynapseComponent } from "./QueueSynapse.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_W = 140;
const NODE_H = 68;
const GAP_X = 20;
const GAP_Y = 20;
const SWIMLANE_HDR = 26;
const SWIMLANE_GAP = 14;
const NODES_PER_ROW = 10;
const PAD = 24;
const BG_PAD = 10;

const SWIMLANE_LABELS: Record<string, string> = {
  "data-ingest": "Ingestie Date",
  normalization: "Normalizare",
  validation: "Validare",
  "enrichment-fiscal": "Îmbogățire Fiscală",
  "enrichment-external": "Îmbogățire Externă",
  "ai-analysis": "Analiză AI",
  "dedup-scoring": "Deduplicare & Scoring",
  "pipeline-control": "Control Pipeline",
  "human-oversight": "Supraveghere Umană",
  "product-knowledge": "Cunoaștere Produs",
  "ai-reasoning": "Raționament AI",
  "fiscal-execution": "Execuție Fiscală",
};

const SWIMLANE_ACCENT: Record<string, string> = {
  "data-ingest": "oklch(0.3 0.04 230 / 28%)",
  normalization: "oklch(0.28 0.04 270 / 28%)",
  validation: "oklch(0.25 0.05 190 / 28%)",
  "enrichment-fiscal": "oklch(0.25 0.04 260 / 28%)",
  "enrichment-external": "oklch(0.28 0.05 290 / 28%)",
  "ai-analysis": "oklch(0.3 0.08 80 / 28%)",
  "dedup-scoring": "oklch(0.28 0.06 340 / 28%)",
  "pipeline-control": "oklch(0.35 0.12 85 / 28%)",
  "human-oversight": "oklch(0.45 0.02 260 / 28%)",
  "product-knowledge": "oklch(0.27 0.05 150 / 28%)",
  "ai-reasoning": "oklch(0.3 0.07 95 / 28%)",
  "fiscal-execution": "oklch(0.32 0.1 55 / 28%)",
};

// ─── Layout computation ───────────────────────────────────────────────────────

/** Zoom-level granularity for the canvas rendering. */
type LodLevel = "minimal" | "standard" | "detailed";

/** Runtime status of a cognitive node, driven de SSE + topology. */
type NodeStatus = CognitiveNode["status"];

type StatusAction = { nodeKey: string; status: NodeStatus };

function statusReducer(
  state: Map<string, NodeStatus>,
  action: StatusAction,
): Map<string, NodeStatus> {
  return new Map(state).set(action.nodeKey, action.status);
}

type LayoutResult = {
  positions: Map<string, { x: number; y: number }>;
  bgRects: Array<{ swimlane: string; x: number; y: number; width: number; height: number }>;
};

function computeLayout(nodes: CognitiveNode[]): LayoutResult {
  const positions = new Map<string, { x: number; y: number }>();
  const bgRects: LayoutResult["bgRects"] = [];
  let currentY = PAD;

  for (const swimlane of SWIMLANES) {
    const swimlaneNodes = nodes.filter((n) => n.swimlane === swimlane);
    const numRows = Math.max(1, Math.ceil(swimlaneNodes.length / NODES_PER_ROW));
    const colsInRow = Math.min(swimlaneNodes.length, NODES_PER_ROW);
    const bgWidth = Math.max(300, colsInRow * (NODE_W + GAP_X) + BG_PAD * 2);
    const bgHeight = SWIMLANE_HDR + numRows * (NODE_H + GAP_Y) + BG_PAD;

    bgRects.push({ swimlane, x: PAD - BG_PAD, y: currentY, width: bgWidth, height: bgHeight });

    swimlaneNodes.forEach((node, i) => {
      const row = Math.floor(i / NODES_PER_ROW);
      const col = i % NODES_PER_ROW;
      positions.set(node.nodeKey, {
        x: PAD + col * (NODE_W + GAP_X),
        y: currentY + SWIMLANE_HDR + row * (NODE_H + GAP_Y),
      });
    });

    currentY += bgHeight + SWIMLANE_GAP;
  }

  return { positions, bgRects };
}

// ─── Catalog → CognitiveNode (static fallback) ───────────────────────────────

const CATALOG_NODES: CognitiveNode[] = COGNITIVE_NODE_CATALOG.map((e) => ({
  nodeKey: e.nodeKey,
  queueName: e.queueName,
  neuronType: e.neuronType,
  swimlane: e.swimlane,
  status: "ACTIVE" as const,
  metrics: { processed: 0, failed: 0, avgLatency: 0 },
}));

/**
 * Muchii statice de fallback — o sinapsă reprezentativă per pereche consecutivă de swimlane-uri.
 * Vizualizează fluxul cognitiv al pipeline-ului când API-ul nu răspunde.
 */
const CATALOG_EDGES: CognitiveEdge[] = (() => {
  const edges: CognitiveEdge[] = [];
  for (let i = 0; i < SWIMLANES.length - 1; i++) {
    const from = COGNITIVE_NODE_CATALOG.find((n) => n.swimlane === SWIMLANES[i]);
    const to = COGNITIVE_NODE_CATALOG.find((n) => n.swimlane === SWIMLANES[i + 1]);
    if (from && to) {
      edges.push({
        sourceNodeKey: from.nodeKey,
        targetNodeKey: to.nodeKey,
        edgeType: "DATA_FLOW",
        weight: 1,
      });
    }
  }
  return edges;
})();

// ─── Swimlane background node ─────────────────────────────────────────────────

type SwimlaneBgData = {
  swimlane: string;
  width: number;
  height: number;
  nodeCount: number;
};
type SwimlaneBgNode = Node<SwimlaneBgData, "swimlaneBg">;

function SwimlaneBgNodeComponent({ data }: NodeProps<SwimlaneBgNode>) {
  const label = SWIMLANE_LABELS[data.swimlane] ?? data.swimlane;
  const bgColor = SWIMLANE_ACCENT[data.swimlane] ?? "oklch(0.14 0.018 255 / 28%)";

  return (
    <div
      data-testid={`swimlane-bg-${data.swimlane}`}
      style={{
        width: data.width,
        height: data.height,
        background: bgColor,
        border: "1px solid oklch(0.22 0.018 255 / 40%)",
        borderRadius: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          height: SWIMLANE_HDR,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-t3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 9.5, color: "var(--color-t4)" }}>{data.nodeCount}</span>
      </div>
    </div>
  );
}

// ─── Swimlane aggregate node (minimal LOD) ────────────────────────────────────

type AggregateNodeData = {
  swimlane: string;
  total: number;
  active: number;
  errors: number;
};
type SwimlaneAggregateNode = Node<AggregateNodeData, "swimlaneAggregate">;

function resolveAggregateBorderColor(hasErrors: boolean, selected: boolean): string {
  if (hasErrors) return "var(--color-er)";
  if (selected) return "var(--color-b5)";
  return "oklch(0.3 0.018 255 / 70%)";
}

function getLodLabel(lod: LodLevel): string {
  if (lod === "minimal") return "Vista agregată";
  if (lod === "detailed") return "Detaliat";
  return "Standard";
}

function SwimlaneAggregateNodeComponent({ data, selected }: NodeProps<SwimlaneAggregateNode>) {
  const label = SWIMLANE_LABELS[data.swimlane] ?? data.swimlane;
  const hasErrors = data.errors > 0;

  return (
    <div
      data-testid={`aggregate-${data.swimlane}`}
      style={{
        width: 200,
        height: 60,
        background: "var(--color-s800)",
        border: `1.5px solid ${resolveAggregateBorderColor(hasErrors, selected)}`,
        borderRadius: 8,
        padding: "8px 12px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 3,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t1)" }}>{label}</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: hasErrors ? "var(--color-er)" : "var(--color-ok)",
          }}
        >
          {data.active}/{data.total}
        </span>
      </div>
      {hasErrors && (
        <span style={{ fontSize: 10, color: "var(--color-er)" }}>{data.errors} erori</span>
      )}
    </div>
  );
}

// ─── Static node/edge type maps ───────────────────────────────────────────────

const NODE_TYPES: NodeTypes = {
  neuron: NeuronNodeComponent,
  swimlaneBg: SwimlaneBgNodeComponent,
  swimlaneAggregate: SwimlaneAggregateNodeComponent,
};

const EDGE_TYPES: EdgeTypes = {
  queueSynapse: QueueSynapseComponent,
};

// ─── Flow nodes/edges computation ────────────────────────────────────────────

function buildFlowNodes(
  brainNodes: CognitiveNode[],
  layout: LayoutResult,
  statusOverrides: Map<string, NodeStatus>,
  lod: LodLevel,
  selectedNodeKey: string | null,
): Node[] {
  const nodes: Node[] = [];

  if (lod === "minimal") {
    // Aggregate: one node per swimlane
    for (const swimlane of SWIMLANES) {
      const bg = layout.bgRects.find((r) => r.swimlane === swimlane);
      const swimlaneNodes = brainNodes.filter((n) => n.swimlane === swimlane);
      if (!bg) continue;

      const active = swimlaneNodes.filter((n) => {
        const s = statusOverrides.get(n.nodeKey) ?? n.status;
        return s === "ACTIVE";
      }).length;
      const errors = swimlaneNodes.filter(
        (n) => (statusOverrides.get(n.nodeKey) ?? n.status) === "ERROR",
      ).length;

      nodes.push({
        id: `aggregate-${swimlane}`,
        type: "swimlaneAggregate",
        position: { x: bg.x + 20, y: bg.y + bg.height / 2 - 30 },
        data: { swimlane, total: swimlaneNodes.length, active, errors },
        selected: false,
        draggable: false,
        zIndex: 1,
      } satisfies SwimlaneAggregateNode);
    }
    return nodes;
  }

  // Standard/Detailed: swimlane backgrounds + individual neurons
  for (const rect of layout.bgRects) {
    const count = brainNodes.filter((n) => n.swimlane === rect.swimlane).length;
    nodes.push({
      id: `swimlane-bg-${rect.swimlane}`,
      type: "swimlaneBg",
      position: { x: rect.x, y: rect.y },
      data: { swimlane: rect.swimlane, width: rect.width, height: rect.height, nodeCount: count },
      selectable: false,
      draggable: false,
      focusable: false,
      connectable: false,
      zIndex: -1,
    } satisfies SwimlaneBgNode);
  }

  for (const node of brainNodes) {
    const pos = layout.positions.get(node.nodeKey);
    if (!pos) continue;

    const catalogEntry = COGNITIVE_NODE_CATALOG.find((e) => e.nodeKey === node.nodeKey);
    const status = statusOverrides.get(node.nodeKey) ?? node.status;

    nodes.push({
      id: node.nodeKey,
      type: "neuron",
      position: pos,
      width: NODE_W,
      height: NODE_H,
      selected: node.nodeKey === selectedNodeKey,
      draggable: false,
      zIndex: 1,
      data: {
        nodeKey: node.nodeKey,
        neuronType: node.neuronType,
        swimlane: node.swimlane,
        status,
        metrics: node.metrics,
        cognitiveFunction: catalogEntry?.cognitiveFunction,
        biologicalAnalogy: catalogEntry?.biologicalAnalogy,
        displayName: catalogEntry?.displayName,
        pulsing: catalogEntry?.pulsing,
        criticality: catalogEntry?.criticality,
        showMetrics: lod === "detailed",
        showDetails: true,
      },
    } satisfies NeuronNodeType);
  }

  return nodes;
}

function buildFlowEdges(
  brainEdges: CognitiveEdge[],
  lod: LodLevel,
  showEdgeLabels: boolean,
): Edge[] {
  if (lod === "minimal") {
    const edges: Edge[] = [];
    for (let i = 0; i < SWIMLANES.length - 1; i++) {
      const a = SWIMLANES[i];
      const b = SWIMLANES[i + 1];
      edges.push({
        id: `lod-edge-${a}-${b}`,
        source: `aggregate-${a}`,
        target: `aggregate-${b}`,
        type: "queueSynapse",
        animated: false,
        label: showEdgeLabels ? "depends_on" : undefined,
        data: { edgeType: "depends_on", weight: 0.5 },
        zIndex: 0,
      });
    }
    return edges;
  }

  return brainEdges.map((edge) => ({
    id: `edge-${edge.sourceNodeKey}-${edge.targetNodeKey}`,
    source: edge.sourceNodeKey,
    target: edge.targetNodeKey,
    type: "queueSynapse",
    animated: edge.edgeType === "DATA_FLOW",
    label: showEdgeLabels ? edge.edgeType : undefined,
    data: { edgeType: edge.edgeType, weight: edge.weight },
    zIndex: 0,
  }));
}

// ─── Topology query ───────────────────────────────────────────────────────────

// ─── Connection status badge ──────────────────────────────────────────────────

interface ConnectionBadgeProps {
  readonly connected: boolean;
}

function ConnectionBadge({ connected }: ConnectionBadgeProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 10,
        color: connected ? "var(--color-ok)" : "var(--color-t4)",
        background: "var(--color-s900)",
        border: "1px solid oklch(0.22 0.018 255 / 50%)",
        borderRadius: 6,
        padding: "3px 8px",
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: connected ? "var(--color-ok)" : "var(--color-t4)",
          boxShadow: connected ? "0 0 4px var(--color-ok)" : "none",
        }}
      />
      {connected ? "Live" : "Offline"}
    </div>
  );
}

// ─── Canvas sub-components ────────────────────────────────────────────────────

interface LoadingOverlayProps {
  readonly visible: boolean;
}

function LoadingOverlay({ visible }: LoadingOverlayProps) {
  if (!visible) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        background: "oklch(0.08 0.01 255 / 60%)",
        fontSize: 13,
        color: "var(--color-t3)",
      }}
    >
      Se încarcă topologia…
    </div>
  );
}

interface CanvasStatusBarProps {
  readonly connected: boolean;
  readonly lodLabel: string;
  readonly neuronCount: number;
}

function CanvasStatusBar({ connected, lodLabel, neuronCount }: CanvasStatusBarProps) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <ConnectionBadge connected={connected} />
      <div
        style={{
          fontSize: 10,
          color: "var(--color-t3)",
          background: "var(--color-s900)",
          border: "1px solid oklch(0.22 0.018 255 / 50%)",
          borderRadius: 6,
          padding: "3px 8px",
        }}
      >
        {lodLabel} · {neuronCount} neuroni
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CognitiveBrainCanvasProps {
  readonly batchId: string | null;
  readonly selectedNodeKey: string | null;
  readonly onNodeSelect: (key: string) => void;
}

export function CognitiveBrainCanvas({
  batchId,
  selectedNodeKey,
  onNodeSelect,
}: CognitiveBrainCanvasProps) {
  const [zoom, setZoom] = useState(0.7);
  const queryClient = useQueryClient();
  const topoInvalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleTopologyRefresh = useCallback(() => {
    if (topoInvalidateTimerRef.current) clearTimeout(topoInvalidateTimerRef.current);
    topoInvalidateTimerRef.current = setTimeout(() => {
      queryClient
        .invalidateQueries({ queryKey: ["cognitive-brain", "topology"] })
        .catch(voidAsyncHandler);
    }, 400);
  }, [queryClient]);

  // Status overrides from live SSE stream — useReducer makes state transitions
  // explicit and ensures SonarQube can track that statusOverrides is consumed.
  const [statusOverrides, dispatchStatus] = useReducer(
    statusReducer,
    new Map<string, NodeStatus>(),
  );

  const handleCognitiveEvent = useCallback((event: CognitiveEvent) => {
    const { eventType, nodeKey } = event;
    if (
      eventType === "node_started" ||
      eventType === "node_completed" ||
      eventType === "node_resumed"
    ) {
      dispatchStatus({ nodeKey, status: "ACTIVE" });
    } else if (eventType === "node_error" || eventType === "node_failed") {
      dispatchStatus({ nodeKey, status: "ERROR" });
    } else if (eventType === "node_paused" || eventType === "PAUSE_PROPAGATED") {
      dispatchStatus({ nodeKey, status: "PAUSED" });
    }
  }, []);

  const { connected } = useCognitiveEventStream(handleCognitiveEvent, {
    batchId,
    afterEvent: scheduleTopologyRefresh,
  });

  // Fetch topology — uses shared hook (single query, no duplicate fetches)
  const {
    nodes: remoteNodes,
    edges: remoteEdges,
    isLoading: topologyLoading,
  } = useCognitiveBrain(batchId ?? undefined);

  const isCatalogFallback = remoteNodes.length === 0;

  // Resolved display nodes — fallback la catalog când API nu întoarce noduri
  const displayNodes = useMemo<CognitiveNode[]>(() => {
    if (remoteNodes.length > 0) return remoteNodes;
    return CATALOG_NODES;
  }, [remoteNodes]);

  const displayEdges = useMemo<CognitiveEdge[]>(() => {
    if (remoteEdges.length > 0) return remoteEdges;
    return CATALOG_EDGES;
  }, [remoteEdges]);

  // LOD — zoom AND node count both influence detail level
  const { lod, showEdgeLabels } = useCognitiveLOD(zoom, displayNodes.length);

  // Layout — recomputed only when node set changes
  const layout = useMemo(() => computeLayout(displayNodes), [displayNodes]);

  // ReactFlow nodes & edges
  const flowNodes = useMemo(
    () => buildFlowNodes(displayNodes, layout, statusOverrides, lod, selectedNodeKey),
    [displayNodes, layout, statusOverrides, lod, selectedNodeKey],
  );

  const flowEdges = useMemo(
    () => buildFlowEdges(displayEdges, lod, showEdgeLabels),
    [displayEdges, lod, showEdgeLabels],
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "neuron") onNodeSelect(node.id);
    },
    [onNodeSelect],
  );

  const handleMoveEnd = useCallback((_: unknown, viewport: Viewport) => setZoom(viewport.zoom), []);

  // LOD info badge
  const lodLabel = getLodLabel(lod);

  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <div
        data-testid="cognitive-brain-canvas"
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <LoadingOverlay visible={topologyLoading} />

        {isCatalogFallback && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 12,
              fontSize: 11,
              color: "var(--color-t2)",
              background: "var(--color-s900)",
              border: "1px solid oklch(0.35 0.08 85 / 45%)",
              borderRadius: 8,
              padding: "6px 12px",
              maxWidth: 480,
              textAlign: "center",
            }}
          >
            Catalog static — fără răspuns topologie de la API; metricile sunt zero și nu reflectă
            runtime.
          </div>
        )}

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodeClick={handleNodeClick}
          onMoveEnd={handleMoveEnd}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          minZoom={0.15}
          maxZoom={3}
          fitView={!topologyLoading && flowNodes.length > 0}
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          style={{ background: "var(--color-s950)" }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="oklch(0.22 0.015 255 / 40%)"
          />
          <Controls
            style={{
              background: "var(--color-s800)",
              border: "1px solid oklch(0.22 0.018 255 / 50%)",
              borderRadius: 8,
            }}
          />
          <MiniMap
            style={{
              background: "var(--color-s900)",
              border: "1px solid oklch(0.22 0.018 255 / 50%)",
              borderRadius: 8,
            }}
            nodeColor={(n: Node) => {
              const neuronType = n.data.neuronType as string | undefined;
              return NEURON_COLORS[neuronType ?? ""] ?? "var(--color-s700)";
            }}
          />

          {/* Top-left: status badges */}
          <Panel position="top-left">
            <CanvasStatusBar
              connected={connected}
              lodLabel={lodLabel}
              neuronCount={displayNodes.length}
            />
          </Panel>
        </ReactFlow>
      </div>
    </TooltipPrimitive.Provider>
  );
}
