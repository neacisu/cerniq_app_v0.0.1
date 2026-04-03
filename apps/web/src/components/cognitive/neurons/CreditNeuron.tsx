/**
 * CreditNeuron — E4 Credit Scoring 100p (C13-C18) + Credit Limits (D19-D21)
 *
 * Visual: indigo financial intelligence glow — oklch(0.27 0.05 270)
 * Swimlane: credit-decision
 * Icon: CreditCard — financial assessment signal
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { CreditCard } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type CreditNeuronType = Node<NeuronNodeData, "credit-neuron">;

const COLOR = "var(--color-neuron-credit)";

export const CreditNeuronComponent = memo(function CreditNeuronComponent({
  data,
  selected,
}: NodeProps<CreditNeuronType>) {
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
      data-testid="credit-neuron"
      data-neuron-type="CreditNeuron"
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

      {/* Score badge */}
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
        CREDIT
      </div>

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <CreditCard size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
