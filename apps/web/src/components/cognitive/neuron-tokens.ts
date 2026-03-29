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
  KnowledgeNeuron: "var(--color-neuron-domain)",
  GuardrailNeuron: "var(--color-neuron-reflex)",
  HumanNeuron: "var(--color-neuron-human)",
  PredictiveNeuron: "var(--color-neuron-meta)",
  ToolNeuron: "var(--color-neuron-factual)",
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
