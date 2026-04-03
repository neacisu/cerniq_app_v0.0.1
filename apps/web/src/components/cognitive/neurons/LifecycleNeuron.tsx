/**
 * LifecycleNeuron — E5 Lifecycle Nurturing FSM (A1-A8)
 *
 * Visual: teal warm — oklch(0.3 0.06 200)
 * Swimlane: lifecycle-nurturing
 * Analogie biologică: Cortex cingulat posterior — self-monitoring
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { RefreshCcw } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type LifecycleNeuronType = Node<NeuronNodeData, "lifecycle-neuron">;

const COLOR = "var(--color-neuron-lifecycle)";

export const LifecycleNeuronComponent = memo(function LifecycleNeuronComponent({
  data,
  selected,
}: NodeProps<LifecycleNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;

  const border = selected ? "2px solid var(--color-b5)" : `1.5px solid ${COLOR}`;

  const boxShadow = selected
    ? `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${COLOR} 40%, transparent)`
    : `0 0 6px color-mix(in oklch, ${COLOR} 30%, transparent)`;

  return (
    <div
      data-testid="lifecycle-neuron"
      data-neuron-type="LifecycleNeuron"
      data-status={data.status}
      style={{
        width: 148,
        height: 68,
        background: `color-mix(in oklch, ${COLOR} 16%, transparent)`,
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
        LIFECYCLE
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <RefreshCcw size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
          <span>clients: {data.metrics.processed}</span>
          <span style={{ color: data.metrics.failed > 0 ? "var(--color-er)" : "var(--color-ok)" }}>
            {data.metrics.failed > 0 ? `✗ ${data.metrics.failed}` : "✓"}
          </span>
          <span>{data.metrics.avgLatency}ms</span>
        </div>
      )}
    </div>
  );
});
