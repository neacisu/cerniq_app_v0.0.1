/**
 * ChurnNeuron — E5 Churn Prevention & AI Scoring (B9-B14 Claude)
 *
 * Visual: purple pulse — oklch(0.3 0.1 310) pulsing when active
 * Swimlane: churn-prevention
 * Analogie biologică: Amigdală — detectare pericol
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { TrendingDown } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type ChurnNeuronType = Node<NeuronNodeData, "churn-neuron">;

const COLOR = "var(--color-neuron-churn)";

function churnNeuronBoxShadow(selected: boolean, isActive: boolean, accent: string): string {
  if (selected) {
    return `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${accent} 50%, transparent)`;
  }
  if (isActive) {
    return `0 0 10px color-mix(in oklch, ${accent} 60%, transparent), 0 0 20px color-mix(in oklch, ${accent} 20%, transparent)`;
  }
  return `0 0 5px color-mix(in oklch, ${accent} 25%, transparent)`;
}

export const ChurnNeuronComponent = memo(function ChurnNeuronComponent({
  data,
  selected,
}: NodeProps<ChurnNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isActive = data.status === "ACTIVE";

  const border = selected ? "2px solid var(--color-b5)" : `1.5px solid ${COLOR}`;

  const boxShadow = churnNeuronBoxShadow(selected, isActive, COLOR);

  return (
    <div
      data-testid="churn-neuron"
      data-neuron-type="ChurnNeuron"
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
        transition: "box-shadow 0.3s",
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
        CHURN AI
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <TrendingDown size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
          <span>scored: {data.metrics.processed}</span>
          <span style={{ color: data.metrics.failed > 0 ? "var(--color-er)" : "var(--color-ok)" }}>
            {data.metrics.failed > 0 ? `✗ ${data.metrics.failed}` : "✓"}
          </span>
          <span>{data.metrics.avgLatency}ms</span>
        </div>
      )}
    </div>
  );
});
