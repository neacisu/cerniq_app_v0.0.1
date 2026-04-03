/**
 * ComplianceNeuron — E5 GDPR Compliance (K56-K58)
 *
 * Visual: gray bright — oklch(0.4 0.02 260)
 * Swimlane: compliance-gdpr
 * Analogie biologică: Sistem imunitar cognitiv
 */
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Lock } from "lucide-react";
import type { NeuronNodeData } from "../NeuronNode.js";

export type ComplianceNeuronType = Node<NeuronNodeData, "compliance-neuron">;

const COLOR = "var(--color-neuron-compliance)";

function complianceNeuronBorder(selected: boolean, isCritical: boolean, accent: string): string {
  if (selected) return "2px solid var(--color-b5)";
  if (isCritical) return "1.5px solid var(--color-er)";
  return `1.5px solid ${accent}`;
}

export const ComplianceNeuronComponent = memo(function ComplianceNeuronComponent({
  data,
  selected,
}: NodeProps<ComplianceNeuronType>) {
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";

  const border = complianceNeuronBorder(selected, isCritical, COLOR);

  const boxShadow = selected
    ? `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${COLOR} 40%, transparent)`
    : `0 0 6px color-mix(in oklch, ${COLOR} 30%, transparent)`;

  return (
    <div
      data-testid="compliance-neuron"
      data-neuron-type="ComplianceNeuron"
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
        GDPR
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
        <Lock size={14} color={COLOR} strokeWidth={2} aria-hidden />
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
          <span>checks: {data.metrics.processed}</span>
          <span style={{ color: data.metrics.failed > 0 ? "var(--color-er)" : "var(--color-ok)" }}>
            {data.metrics.failed > 0 ? `✗ ${data.metrics.failed}` : "✓ GDPR OK"}
          </span>
        </div>
      )}
    </div>
  );
});
