import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QueueSynapseData = {
  edgeType: string;
  weight?: number;
};

export type QueueSynapseEdge = Edge<QueueSynapseData, "queueSynapse">;

// ─── Color map — covers both CognitiveEdge.edgeType and EdgeKind values ───────

const EDGE_COLORS: Record<string, string> = {
  // CognitiveEdge static topology types
  DATA_FLOW: "var(--color-synapse-depends)",
  TRIGGER: "var(--color-synapse-triggers)",
  FALLBACK: "var(--color-synapse-retries)",
  // EdgeKind DB enum values
  triggers: "var(--color-synapse-triggers)",
  depends_on: "var(--color-synapse-depends)",
  reads: "var(--color-synapse-depends)",
  writes: "var(--color-synapse-mutates)",
  mutates: "var(--color-synapse-mutates)",
  blocks: "var(--color-synapse-blocks)",
  retries: "var(--color-synapse-retries)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const QueueSynapseComponent = memo(function QueueSynapseComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
}: EdgeProps<QueueSynapseEdge>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType = data?.edgeType ?? "DATA_FLOW";
  const color = EDGE_COLORS[edgeType] ?? "var(--color-synapse-depends)";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          strokeOpacity: 0.65,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 9,
              color,
              background: "var(--color-s900)",
              padding: "1px 5px",
              borderRadius: 3,
              pointerEvents: "none",
              border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
              fontFamily: "var(--font-mono)",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
