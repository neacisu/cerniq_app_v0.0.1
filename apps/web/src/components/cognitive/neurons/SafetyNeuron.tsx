/**
 * SafetyNeuron — E3 Autonomous Safety Net (H48 eFactura deadline)
 *
 * Visual: red CRITICAL — oklch(0.4 0.18 15) always ON
 * Swimlane: fiscal-execution / human-oversight-e3
 * Analogie biologică: Centrul de supraviețuire — brainstem
 * SAFETY-NET: amenda legală 15-20% din valoarea facturii
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertOctagon } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type SafetyNeuronType = Node<NeuronNodeData, "safety-neuron">;

const COLOR = "var(--color-neuron-safety)";
const COLOR_CRITICAL = "var(--color-er)";

export const SafetyNeuronComponent = memo(function SafetyNeuronComponent({
  data,
  selected,
}: NodeProps<SafetyNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;

  const boxShadow = selected
    ? `0 0 0 2px var(--color-b5), 0 0 16px color-mix(in oklch, ${COLOR} 70%, transparent)`
    : `0 0 12px color-mix(in oklch, ${COLOR} 80%, transparent), 0 0 24px color-mix(in oklch, ${COLOR_CRITICAL} 25%, transparent)`;

  return (
    <div
      data-testid="safety-neuron"
      data-neuron-type="SafetyNeuron"
      data-status={data.status}
      style={{
        width: 148,
        height: 68,
        background: `color-mix(in oklch, ${COLOR} 22%, transparent)`,
        border: `2px solid ${COLOR_CRITICAL}`,
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
          fontSize: 7,
          fontWeight: 700,
          color: COLOR_CRITICAL,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        SAFETY NET
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <AlertOctagon size={14} color={COLOR_CRITICAL} strokeWidth={2.5} aria-hidden />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
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
          <span>checks: {data.metrics.processed}</span>
          <span
            style={{
              color: data.metrics.failed > 0 ? COLOR_CRITICAL : "var(--color-ok)",
              fontWeight: data.metrics.failed > 0 ? 700 : 400,
            }}
          >
            {data.metrics.failed > 0 ? `🚨 ${data.metrics.failed}` : "✓ OK"}
          </span>
        </div>
      )}
    </div>
  );
});
