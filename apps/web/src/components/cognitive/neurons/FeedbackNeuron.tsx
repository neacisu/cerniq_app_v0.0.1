/**
 * FeedbackNeuron — E5 NPS Feedback (H43-H47)
 *
 * Visual: teal warm glow — oklch(0.3 0.06 200)
 * Swimlane: lifecycle-nurturing
 * Icon: MessageSquare — colectare NPS 90-day cooldown și routing plângeri
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type FeedbackNeuronType = Node<NeuronNodeData, "feedback-neuron">;

const COLOR = "var(--color-neuron-feedback)";

export const FeedbackNeuronComponent = memo(function FeedbackNeuronComponent({
  data,
  selected,
}: NodeProps<FeedbackNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";

  let border = `1.5px solid ${COLOR}`;
  if (selected) border = "2px solid var(--color-b5)";
  else if (isCritical) border = "1.5px solid var(--color-er)";

  const boxShadow = selected
    ? `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${COLOR} 40%, transparent)`
    : `0 0 6px color-mix(in oklch, ${COLOR} 35%, transparent)`;

  return (
    <div
      data-testid="feedback-neuron"
      data-neuron-type="FeedbackNeuron"
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

      {/* Tier badge */}
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
        NPS
      </div>

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <MessageSquare size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
