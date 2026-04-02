/**
 * LogisticsNeuron — E4 Sameday AWB + Tracking (E22-E27) + Stock Sync (F28-F31) + Returns (H37-H38)
 *
 * Visual: lime logistics flow glow — oklch(0.35 0.08 140)
 * Swimlane: logistics
 * Icon: Truck — physical shipment execution
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Truck } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type LogisticsNeuronType = Node<NeuronNodeData, "logistics-neuron">;

const COLOR = "var(--color-neuron-logistics)";

export const LogisticsNeuronComponent = memo(function LogisticsNeuronComponent({
  data,
  selected,
}: NodeProps<LogisticsNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";

  let border = `1.5px solid ${COLOR}`;
  if (selected) border = "2px solid var(--color-b5)";
  else if (isCritical) border = "1.5px solid var(--color-er)";

  let boxShadow = "none";
  if (selected)
    boxShadow = `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${COLOR} 40%, transparent)`;
  else if (isCritical) boxShadow = `0 0 8px color-mix(in oklch, ${COLOR} 50%, transparent)`;

  return (
    <div
      data-testid="logistics-neuron"
      data-neuron-type="LogisticsNeuron"
      data-status={data.status}
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
        transition: "box-shadow 0.2s",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      {/* Label badge */}
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
        LOGISTICS
      </div>

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <Truck size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
          <span style={{ color: "var(--color-er)" }}>✗ {data.metrics.failed}</span>
          <span>{data.metrics.avgLatency}ms</span>
        </div>
      )}
    </div>
  );
});
