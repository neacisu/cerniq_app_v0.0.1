/**
 * GraphNeuron — E5 Community Intelligence CPU-INTENSIVE (D20-D24)
 *
 * Visual: gold slow pulse — oklch(0.38 0.12 85) + SLOW animation (pulsing=true)
 * Swimlane: community-intelligence
 * Icon: Network — rețea de relații și comunități Leiden
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Network } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type GraphNeuronType = Node<NeuronNodeData, "graph-neuron">;

const COLOR = "var(--color-neuron-graph)";

export const GraphNeuronComponent = memo(function GraphNeuronComponent({
  data,
  selected,
}: NodeProps<GraphNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";
  const isPulsing = data.pulsing ?? false;

  let border = `1.5px solid ${COLOR}`;
  if (selected) border = "2px solid var(--color-b5)";
  else if (isCritical) border = "1.5px solid var(--color-er)";

  const shadowBlur = isPulsing ? "10px" : "6px";
  const shadowOpacity = isPulsing ? "45%" : "35%";
  const boxShadow = selected
    ? `0 0 0 2px var(--color-b5), 0 0 16px color-mix(in oklch, ${COLOR} 50%, transparent)`
    : `0 0 ${shadowBlur} color-mix(in oklch, ${COLOR} ${shadowOpacity}, transparent)`;

  return (
    <div
      data-testid="graph-neuron"
      data-neuron-type="GraphNeuron"
      data-status={data.status}
      data-pulsing={isPulsing}
      style={{
        width: 148,
        height: 68,
        background: `color-mix(in oklch, ${COLOR} 18%, transparent)`,
        border,
        borderRadius: 8,
        padding: "8px 10px",
        cursor: "pointer",
        position: "relative",
        boxShadow,
        transition: "box-shadow 0.3s ease-in-out",
        animation: isPulsing ? "graphNeuronPulse 3s ease-in-out infinite" : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {/* CPU-INTENSIVE badge */}
      <div
        style={{
          position: "absolute",
          top: 5,
          right: 7,
          fontSize: 8,
          fontWeight: 700,
          color: COLOR,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {isPulsing ? "CPU⚡" : "GRAPH"}
      </div>

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <Network size={14} color={COLOR} strokeWidth={2} aria-hidden />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--color-t1)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {label}
        </span>
      </div>

      {data.showMetrics && (
        <div
          style={{ marginTop: 6, display: "flex", gap: 8, fontSize: 9.5, color: "var(--color-t3)" }}
        >
          <span>✓ {data.metrics.processed}</span>
          {data.metrics.failed > 0 && (
            <span style={{ color: "var(--color-er)" }}>✗ {data.metrics.failed}</span>
          )}
          <span>{data.metrics.avgLatency}ms</span>
        </div>
      )}
    </div>
  );
});
