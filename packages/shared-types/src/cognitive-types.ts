export type NeuronType =
  | "SensoryNeuron"
  | "NormalizationNeuron"
  | "ReflexNeuron"
  | "FactualNeuron"
  | "DiscoveryNeuron"
  | "DeliberativeNeuron"
  | "SpatialNeuron"
  | "DomainNeuron"
  | "PatternNeuron"
  | "MetaNeuron"
  | "ExecutiveNeuron"
  | "MaintenanceNeuron"
  | "HumanNeuron"
  | "AttentionNeuron"
  | "EmotionNeuron"
  | "ProceduralNeuron"
  | "AutonomicNeuron"
  | "VigilanceNeuron";

export type Swimlane =
  | "data-ingest"
  | "normalization"
  | "validation"
  | "enrichment-fiscal"
  | "enrichment-external"
  | "ai-analysis"
  | "geospatial"
  | "domain-agriculture"
  | "dedup-scoring"
  | "pipeline-control"
  | "human-oversight"
  | "social-action";

export type CognitiveNodeKind = "worker" | "queue" | "external_api" | "data_mutation" | "endpoint";

export interface CognitiveNodeDef {
  nodeKey: string;
  displayName: string;
  queueName: string;
  neuronType: NeuronType;
  swimlane: Swimlane;
  etapa: 1 | 2 | 3 | 4 | 5;
  cognitiveFunction: string;
  biologicalAnalogy: string;
  criticality: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  pulsing?: boolean;
}

export interface CognitiveEdgeDef {
  sourceNodeKey: string;
  targetNodeKey: string;
  edgeType: "DATA_FLOW" | "TRIGGER" | "FALLBACK" | "DEPENDS_ON";
}

export interface CognitiveBrain {
  nodes: CognitiveNodeDef[];
  edges: CognitiveEdgeDef[];
}
