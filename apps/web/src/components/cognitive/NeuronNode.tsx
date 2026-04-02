import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
  Antenna,
  Activity,
  AlertTriangle,
  BarChart2,
  BookOpen,
  Brain,
  Cpu,
  CreditCard,
  Database,
  FileCheck,
  Filter,
  GitBranch,
  GitMerge,
  Heart,
  Lock,
  Network,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Sliders,
  Truck,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import {
  NEURON_COLORS,
  NEURON_COLOR_FALLBACK,
  STATUS_COLORS,
  STATUS_COLOR_FALLBACK,
} from "./neuron-tokens.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NeuronNodeData = {
  nodeKey: string;
  neuronType: string;
  swimlane: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  metrics: { processed: number; failed: number; avgLatency: number };
  cognitiveFunction?: string;
  biologicalAnalogy?: string;
  displayName?: string;
  pulsing?: boolean;
  showMetrics?: boolean;
  showDetails?: boolean;
  criticality?: string;
};

export type NeuronNodeType = Node<NeuronNodeData, "neuron">;

// ─── Private icon map (not exported — stays in this module) ───────────────────

const NEURON_ICONS: Record<string, React.ElementType> = {
  SensoryNeuron: Antenna,
  MotorNeuron: Cpu,
  DeliberativeNeuron: Brain,
  ReflexNeuron: Zap,
  AssociativeNeuron: Search,
  ProceduralNeuron: GitBranch,
  RulesNeuron: Filter,
  AutonomicNeuron: Wrench,
  ExecutiveNeuron: Network,
  AttentionNeuron: Activity,
  EmotionNeuron: Heart,
  KnowledgeNeuron: BookOpen,
  GuardrailNeuron: Shield,
  HumanNeuron: User,
  PredictiveNeuron: BarChart2,
  ToolNeuron: Database,
  // ── E4 new types ─────────────────────────────────────────────────────────
  PerceptionNeuron: Antenna,
  ReconciliationNeuron: GitMerge,
  CreditNeuron: CreditCard,
  LimitNeuron: Sliders,
  LogisticsNeuron: Truck,
  StockNeuron: Package,
  ContractNeuron: FileCheck,
  ReturnNeuron: RotateCcw,
  AlertNeuron: AlertTriangle,
  ComplianceNeuron: Lock,
  MetaNeuron: BarChart2,
  MaintenanceNeuron: Settings,
  VigilanceNeuron: RefreshCw,
};

// ─── Style helpers (pure functions — no React, no side-effects) ───────────────

function resolveBorderColor(selected: boolean, isCritical: boolean, nodeColor: string): string {
  if (selected) return "var(--color-b5)";
  if (isCritical) return "var(--color-er)";
  return nodeColor;
}

function resolveBoxShadow(selected: boolean, pulsing: boolean, nodeColor: string): string {
  if (selected) {
    return `0 0 0 2px var(--color-b5), 0 0 12px color-mix(in oklch, ${nodeColor} 40%, transparent)`;
  }
  if (pulsing) {
    return `0 0 8px color-mix(in oklch, ${nodeColor} 50%, transparent)`;
  }
  return "none";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const NeuronNodeComponent = memo(function NeuronNodeComponent({
  data,
  selected,
}: NodeProps<NeuronNodeType>) {
  const color = NEURON_COLORS[data.neuronType] ?? NEURON_COLOR_FALLBACK;
  const statusColor = STATUS_COLORS[data.status] ?? STATUS_COLOR_FALLBACK;
  const Icon = NEURON_ICONS[data.neuronType] ?? Brain;
  const label = data.displayName ?? data.nodeKey.split(":").pop() ?? data.nodeKey;
  const isCritical = data.criticality === "CRITICAL";

  const borderColor = resolveBorderColor(selected, isCritical, color);
  const boxShadow = resolveBoxShadow(selected, data.pulsing ?? false, color);

  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>
        <div
          data-testid="neuron-node"
          data-neuron-type={data.neuronType}
          data-status={data.status}
          style={{
            width: 140,
            height: 68,
            background: `color-mix(in oklch, ${color} 15%, transparent)`,
            border: `1.5px solid ${borderColor}`,
            borderRadius: 8,
            padding: "8px 10px",
            cursor: "pointer",
            position: "relative",
            boxShadow,
            transition: "box-shadow 0.2s",
          }}
        >
          <Handle
            type="target"
            position={Position.Top}
            style={{ opacity: 0, pointerEvents: "none" }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            style={{ opacity: 0, pointerEvents: "none" }}
          />

          {/* Status dot */}
          <div
            aria-label={`status-${data.status}`}
            style={{
              position: "absolute",
              top: 7,
              right: 8,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: statusColor,
              boxShadow: `0 0 4px ${statusColor}`,
            }}
          />

          {/* Icon + label */}
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon size={14} color={color} strokeWidth={2} aria-hidden />
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

          {/* Metrics — detailed LOD only */}
          {data.showMetrics && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                gap: 8,
                fontSize: 9.5,
                color: "var(--color-t3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span title="jobs processed">{data.metrics.processed.toLocaleString()}</span>
              <span
                title="jobs failed"
                style={{
                  color: data.metrics.failed > 0 ? "var(--color-neuron-failed)" : "var(--color-ok)",
                }}
              >
                {data.metrics.failed > 0 ? `✗${data.metrics.failed}` : "✓"}
              </span>
              <span title="avg latency ms">{Math.round(data.metrics.avgLatency)}ms</span>
            </div>
          )}
        </div>
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={6}
          style={{
            background: "var(--color-s800)",
            border: "1px solid oklch(0.26 0.018 255 / 60%)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            maxWidth: 280,
            zIndex: 600,
            boxShadow: "0 8px 24px oklch(0 0 0 / 40%)",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "var(--color-t1)",
              marginBottom: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            {data.nodeKey}
          </div>
          {data.cognitiveFunction && (
            <div style={{ color: "var(--color-t2)", marginBottom: 2, lineHeight: 1.4 }}>
              {data.cognitiveFunction}
            </div>
          )}
          {data.biologicalAnalogy && (
            <div style={{ color: "var(--color-t3)", fontStyle: "italic", fontSize: 11 }}>
              ≈ {data.biologicalAnalogy}
            </div>
          )}
          <TooltipPrimitive.Arrow style={{ fill: "var(--color-s800)" }} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
});
