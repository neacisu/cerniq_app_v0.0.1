/**
 * Design token maps for the Cognitive Brain canvas.
 *
 * Kept separate from NeuronNode.tsx so that react-refresh can Hot-Reload
 * components without forcing re-mounts when constants change, and so other
 * modules (CognitiveBrainCanvas, MiniMap, etc.) can consume them without
 * creating a circular-component-import.
 */

/** Maps NeuronType → CSS custom property for node fill/border color. */
export const NEURON_COLORS: Record<string, string> = {
  SensoryNeuron: "var(--color-neuron-sensory)",
  MotorNeuron: "var(--color-neuron-motor)",
  DeliberativeNeuron: "var(--color-neuron-deliberate)",
  ReflexNeuron: "var(--color-neuron-reflex)",
  AssociativeNeuron: "var(--color-neuron-discover)",
  ProceduralNeuron: "var(--color-neuron-procedural)",
  RulesNeuron: "var(--color-neuron-normal)",
  AutonomicNeuron: "var(--color-neuron-maintenance)",
  ExecutiveNeuron: "var(--color-neuron-executive)",
  AttentionNeuron: "var(--color-neuron-vigilance)",
  EmotionNeuron: "var(--color-neuron-emotion)",
  HumanNeuron: "var(--color-neuron-human)",
  PredictiveNeuron: "var(--color-neuron-meta)",
  // ── E3 new types — §XI plan L2431-2437 ────────────────────────────────────
  KnowledgeNeuron: "var(--color-neuron-knowledge)",
  GuardrailNeuron: "var(--color-neuron-guardrail)",
  ToolNeuron: "var(--color-neuron-tool)",
  FiscalNeuron: "var(--color-neuron-fiscal)",
  SafetyNeuron: "var(--color-neuron-safety)",
  // ── E4 new types ─────────────────────────────────────────────────────────
  PerceptionNeuron: "var(--color-neuron-sensory)",
  ReconciliationNeuron: "var(--color-neuron-reconcile)",
  CreditNeuron: "var(--color-neuron-credit)",
  LimitNeuron: "var(--color-neuron-normal)",
  LogisticsNeuron: "var(--color-neuron-logistics)",
  StockNeuron: "var(--color-neuron-domain)",
  ContractNeuron: "var(--color-neuron-contract)",
  ReturnNeuron: "var(--color-neuron-procedural)",
  AlertNeuron: "var(--color-neuron-vigilance)",
  ComplianceNeuron: "var(--color-neuron-compliance)",
  MetaNeuron: "var(--color-neuron-meta)",
  MaintenanceNeuron: "var(--color-neuron-maintenance)",
  VigilanceNeuron: "var(--color-neuron-vigilance)",
  // ── E5 new types — §XI plan L2445-2451 ────────────────────────────────────
  LifecycleNeuron: "var(--color-neuron-lifecycle)",
  ChurnNeuron: "var(--color-neuron-churn)",
  SocialNeuron: "var(--color-neuron-social)",
  GraphNeuron: "var(--color-neuron-graph)",
  EnvironmentNeuron: "var(--color-neuron-environment)",
  FeedbackNeuron: "var(--color-neuron-feedback)",
  // ── Extra neuron types (MemoryNeuron, SpatialNeuron) ──────────────────────
  MemoryNeuron: "var(--color-neuron-lifecycle)",
  SpatialNeuron: "var(--color-neuron-social)",
} as const;

/** Maps runtime status → CSS custom property for the status-dot color. */
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "var(--color-neuron-firing)",
  PAUSED: "var(--color-neuron-paused)",
  ERROR: "var(--color-neuron-failed)",
} as const;

/** Fallback color when neuronType is unknown. */
export const NEURON_COLOR_FALLBACK = "var(--color-s700)";

/** Fallback status color when status is unknown. */
export const STATUS_COLOR_FALLBACK = "var(--color-t4)";
