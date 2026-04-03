/**
 * GuardrailNeuron — E3 Deterministic Business Guardrails (M71-M75)
 *
 * Visual: red glow — oklch(0.35 0.15 15) CRITICAL
 * Swimlane: ai-reasoning
 * Analogie biologică: Ganglioni bazali — inhibiție comportamentală
 * CRITICAL: Zero-hallucination enforcement on price/stock/discount/SKU/fiscal
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Shield, ShieldAlert } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type GuardrailNeuronType = Node<NeuronNodeData, "guardrail-neuron">;

const COLOR = "var(--color-neuron-guardrail)";
const COLOR_CRITICAL = "var(--color-er)";

function guardrailBoxShadow(
  selected: boolean,
  isCritical: boolean,
  color: string,
  criticalColor: string,
): string {
  if (selected) {
    return `0 0 0 2px var(--color-b5), 0 0 16px color-mix(in oklch, ${color} 60%, transparent)`;
  }
  if (isCritical) {
    return `0 0 10px color-mix(in oklch, ${color} 70%, transparent), 0 0 20px color-mix(in oklch, ${criticalColor} 30%, transparent)`;
  }
  return `0 0 6px color-mix(in oklch, ${color} 40%, transparent)`;
}

export const GuardrailNeuronComponent = memo(function GuardrailNeuronComponent({
  data,
  selected,
}: NodeProps<GuardrailNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";

  const borderColor = selected ? "var(--color-b5)" : COLOR_CRITICAL;

  const boxShadow = guardrailBoxShadow(selected, isCritical, COLOR, COLOR_CRITICAL);

  const IconEl = isCritical ? ShieldAlert : Shield;

  return (
    <div
      data-testid="guardrail-neuron"
      data-neuron-type="GuardrailNeuron"
      data-status={data.status}
      style={{
        width: 148,
        height: 68,
        background: `color-mix(in oklch, ${COLOR} 20%, transparent)`,
        border: `1.5px solid ${borderColor}`,
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

      {/* CRITICAL badge */}
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
        CRITICAL
      </div>

      {/* Icon + label */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <IconEl size={14} color={COLOR_CRITICAL} strokeWidth={2} aria-hidden />
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
          <span style={{ color: "var(--color-ok)" }}>✓ {data.metrics.processed}</span>
          <span style={{ color: data.metrics.failed > 0 ? COLOR_CRITICAL : "var(--color-ok)" }}>
            {data.metrics.failed > 0 ? `✗ ${data.metrics.failed}` : "PASS"}
          </span>
          <span>{data.metrics.avgLatency}ms</span>
        </div>
      )}
    </div>
  );
});
