/**
 * Cognitive Brain — TypeScript types package.
 *
 * Fișier sursă unică pentru toate tipurile, enum-urile și type guard-urile
 * utilizate de cognitive control plane în API, workers și web.
 *
 * Convenții:
 * - Enum-urile sunt exportate ca `type` (union literal) pentru tree-shaking optimal.
 * - Fiecare union type are un `*_VALUES` const array corespunzător pentru iterare runtime.
 * - Type guard-urile (`is*`) permit narrow-ing safe în consumeri JavaScript/TypeScript.
 */

// ─── ApplyStatus ──────────────────────────────────────────────────────────────

/**
 * Starea ciclului de aplicare a unui config de nod cognitiv.
 * Valorile corespund exact enum-ului PostgreSQL `cognitive_apply_status`.
 *
 * - `immediate`     — config aplicabil fără restart worker (ex: paused flag)
 * - `pending_apply` — necesită restart worker (ex: concurrency, rateLimitMax)
 * - `applied`       — confirmat de fleet prin heartbeat
 */
export type CognitiveApplyStatus = "immediate" | "pending_apply" | "applied";
export const COGNITIVE_APPLY_STATUS_VALUES = [
  "immediate",
  "pending_apply",
  "applied",
] as const satisfies readonly CognitiveApplyStatus[];

export function isCognitiveApplyStatus(v: unknown): v is CognitiveApplyStatus {
  return COGNITIVE_APPLY_STATUS_VALUES.includes(v as CognitiveApplyStatus);
}

// ─── EdgeKind ─────────────────────────────────────────────────────────────────

/**
 * Tipul relației direcționate între noduri cognitive în dependency graph.
 * Valorile corespund exact enum-ului PostgreSQL `cognitive_edge_kind` (tabel `import_cognitive_edges`).
 */
export type EdgeKind =
  | "triggers"
  | "depends_on"
  | "reads"
  | "writes"
  | "mutates"
  | "blocks"
  | "retries";

export const EDGE_KIND_VALUES = [
  "triggers",
  "depends_on",
  "reads",
  "writes",
  "mutates",
  "blocks",
  "retries",
] as const satisfies readonly EdgeKind[];

export function isEdgeKind(v: unknown): v is EdgeKind {
  return EDGE_KIND_VALUES.includes(v as EdgeKind);
}

// ─── AnomalyKind ──────────────────────────────────────────────────────────────

/**
 * Clasa de regulă care a detectat anomalia.
 * Valorile corespund exact enum-ului PostgreSQL `anomaly_rule_kind` (tabel `import_node_anomalies`).
 */
export type AnomalyKind =
  | "stale_heartbeat"
  | "counter_drift"
  | "orphan_job"
  | "missing_parent_context"
  | "retry_exhausted"
  | "mutation_without_provenance"
  | "queue_backpressure"
  | "config_pending_apply";

export const ANOMALY_KIND_VALUES = [
  "stale_heartbeat",
  "counter_drift",
  "orphan_job",
  "missing_parent_context",
  "retry_exhausted",
  "mutation_without_provenance",
  "queue_backpressure",
  "config_pending_apply",
] as const satisfies readonly AnomalyKind[];

export function isAnomalyKind(v: unknown): v is AnomalyKind {
  return ANOMALY_KIND_VALUES.includes(v as AnomalyKind);
}

// ─── CognitiveType ────────────────────────────────────────────────────────────

/**
 * Categoria cognitivă de nivel înalt a unui nod.
 * Corespunde câmpului `cognitive_type` din tabelul `import_cognitive_nodes`.
 * Diferit de `NeuronType` (analogia biologică) — CognitiveType clasifică rolul
 * architectural al nodului în procesarea cognitivă.
 */
export type CognitiveType =
  | "REFLEX"
  | "DELIBERATIVE"
  | "FACTUAL"
  | "EXECUTIVE"
  | "MAINTENANCE"
  | "HUMAN";

export const COGNITIVE_TYPE_VALUES = [
  "REFLEX",
  "DELIBERATIVE",
  "FACTUAL",
  "EXECUTIVE",
  "MAINTENANCE",
  "HUMAN",
] as const satisfies readonly CognitiveType[];

export function isCognitiveType(v: unknown): v is CognitiveType {
  return COGNITIVE_TYPE_VALUES.includes(v as CognitiveType);
}

// ─── CognitiveFunction ────────────────────────────────────────────────────────

/**
 * Rolul funcțional al unui nod cognitiv în arhitectura pipeline-ului.
 * Valorile sunt derivate 1:1 din `SWIMLANES` (SCREAMING_CASE), reprezentând
 * categoria funcțională a swimlane-ului în care operează nodul.
 */
export type CognitiveFunction =
  | "DATA_INGEST"
  | "NORMALIZATION"
  | "VALIDATION"
  | "ENRICHMENT_FISCAL"
  | "ENRICHMENT_EXTERNAL"
  | "AI_ANALYSIS"
  | "DEDUP_SCORING"
  | "PIPELINE_CONTROL"
  | "HUMAN_OVERSIGHT"
  | "PRODUCT_KNOWLEDGE"
  | "AI_REASONING"
  | "FISCAL_EXECUTION";

export const COGNITIVE_FUNCTION_VALUES = [
  "DATA_INGEST",
  "NORMALIZATION",
  "VALIDATION",
  "ENRICHMENT_FISCAL",
  "ENRICHMENT_EXTERNAL",
  "AI_ANALYSIS",
  "DEDUP_SCORING",
  "PIPELINE_CONTROL",
  "HUMAN_OVERSIGHT",
  "PRODUCT_KNOWLEDGE",
  "AI_REASONING",
  "FISCAL_EXECUTION",
] as const satisfies readonly CognitiveFunction[];

export function isCognitiveFunction(v: unknown): v is CognitiveFunction {
  return COGNITIVE_FUNCTION_VALUES.includes(v as CognitiveFunction);
}

/**
 * Mapare canonică swimlane → CognitiveFunction pentru conversie runtime.
 * Permite transformarea valorilor swimlane din catalog în CognitiveFunction.
 */
export const SWIMLANE_TO_COGNITIVE_FUNCTION: Readonly<Record<string, CognitiveFunction>> = {
  "data-ingest": "DATA_INGEST",
  normalization: "NORMALIZATION",
  validation: "VALIDATION",
  "enrichment-fiscal": "ENRICHMENT_FISCAL",
  "enrichment-external": "ENRICHMENT_EXTERNAL",
  "ai-analysis": "AI_ANALYSIS",
  "dedup-scoring": "DEDUP_SCORING",
  "pipeline-control": "PIPELINE_CONTROL",
  "human-oversight": "HUMAN_OVERSIGHT",
  "product-knowledge": "PRODUCT_KNOWLEDGE",
  "ai-reasoning": "AI_REASONING",
  "fiscal-execution": "FISCAL_EXECUTION",
};

// ─── NodeMetrics ──────────────────────────────────────────────────────────────

/**
 * Metrici operaționale ale unui nod cognitiv.
 * Câmpurile de bază (`processed`, `failed`, `avgLatency`) sunt întotdeauna prezente.
 * Câmpurile extinse sunt populare de instanțele live din `import_cognitive_nodes.metrics`.
 */
export interface NodeMetrics {
  /** Numărul total de job-uri procesate cu succes. */
  processed: number;
  /** Numărul total de job-uri eșuate. */
  failed: number;
  /** Latența medie de procesare în milisecunde. */
  avgLatency: number;
}

// ─── NodeControlState ─────────────────────────────────────────────────────────

/**
 * Starea de control runtime a unui nod cognitiv per tenant.
 * Corespunde răspunsului de la `PUT /api/v1/brain/nodes/:nodeKey/config`.
 */
export interface NodeControlState {
  /** true dacă nodul este pauzat via Redis flag `cognitive:pause:{nodeKey}`. */
  paused: boolean;
  /**
   * Statusul ciclului de aplicare al configurației.
   * `pending_apply` → workerul necesită restart pentru a prelua noile setări.
   */
  applyStatus: CognitiveApplyStatus;
  /** Numărul de joburi procesate concurent (BullMQ concurrency). */
  concurrency?: number;
  /** Limita de rate în număr de joburi per `rateLimitDuration` ms. */
  rateLimitMax?: number | null;
  /** Fereastra de timp în ms pentru rate limiting. */
  rateLimitDuration?: number | null;
  /** true dacă `applyStatus === "pending_apply"` (shortcut semantic). */
  requiresWorkerRestart: boolean;
  /** Timestamp ISO al ultimei aplicări confirmate de fleet. */
  appliedAt?: string | null;
  /** Identificatorul instanței worker care a confirmat aplicarea. */
  appliedByWorkerInstance?: string | null;
}

// ─── AnomalyRecord ────────────────────────────────────────────────────────────

/**
 * Anomalie detectată de Cognitive Brain per nod per batch.
 * Corespunde unui rând din tabelul `bronze.import_node_anomalies`.
 */
export interface AnomalyRecord {
  /** ID bigserial (cheia primară din DB). */
  id: number;
  tenantId: string;
  batchId: string;
  nodeKey: string;
  /** Regula care a generat anomalia. */
  ruleKind: AnomalyKind;
  /** Timestamp ISO al momentului detectării. */
  detectedAt: string;
  /** Timestamp ISO al rezolvării (null = anomalie activă). */
  resolvedAt?: string | null;
  /** Context suplimentar specific tipului de anomalie. */
  payload: Record<string, unknown>;
}

// ─── BackgroundProcessRecord ──────────────────────────────────────────────────

/**
 * Reprezintă un proces de fundal asociat unui nod cognitiv.
 * Acoperă procese de tip cron (scheduled), monitoring continuu și
 * procese declanșate la cerere (on-demand).
 *
 * Exemple: o1-daily-stats (SCHEDULED), p3-pipeline-monitor (CONTINUOUS),
 * o3-import-file-cleanup (SCHEDULED), hitl-escalation (ON_DEMAND).
 */
export interface BackgroundProcessRecord {
  nodeKey: string;
  /** Tipul procesului de fundal: schedulat, continuu sau la cerere. */
  processType: "SCHEDULED" | "CONTINUOUS" | "ON_DEMAND";
  /** Timestamp ISO al pornirii procesului. */
  startedAt: string;
  /** Timestamp ISO al finalizării (absent dacă încă rulează). */
  completedAt?: string;
  /** Starea curentă a procesului. */
  status: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  /** Date de context specifice procesului (ex: batchId, stats parțiale). */
  payload?: Record<string, unknown>;
}

export const BACKGROUND_PROCESS_TYPES = [
  "SCHEDULED",
  "CONTINUOUS",
  "ON_DEMAND",
] as const satisfies readonly BackgroundProcessRecord["processType"][];

export const BACKGROUND_PROCESS_STATUSES = [
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const satisfies readonly BackgroundProcessRecord["status"][];

// ─── QueueProfile ─────────────────────────────────────────────────────────────

/**
 * Profilul de stare al unei cozi BullMQ per nod cognitiv.
 * Valorile sunt citite via `queue.getJobCounts()` de monitorizarea queue depth.
 *
 * `depth` este un alias semantic pentru `waiting` — reprezintă presiunea pe coadă
 * (câte job-uri așteaptă să fie procesate).
 */
export interface QueueProfile {
  /** Numele cozii BullMQ (ex: "ingest:csv"). */
  queueName: string;
  /** nodeKey-ul cognitiv asociat cozii. */
  nodeKey: string;
  /** Job-uri care așteaptă un worker disponibil. */
  waiting: number;
  /** Job-uri în procesare activă. */
  active: number;
  /** Job-uri finalizate cu succes. */
  completed: number;
  /** Job-uri terminate cu eroare. */
  failed: number;
  /** Job-uri amânate (delay sau cron viitor). */
  delayed: number;
  /** Job-uri în starea pauzată explicit. */
  paused: number;
  /** Alias semantic pentru `waiting` — presiunea pe coadă. */
  depth: number;
}

// ─── Existing types (backward-compatible extensions) ─────────────────────────

export interface CognitiveBrain {
  nodes: CognitiveNode[];
  edges: CognitiveEdge[];
  metadata: { totalNeurons: number; activeNeurons: number; lastUpdated: string };
}

/**
 * Nodul cognitiv din topology graph.
 * Extins față de versiunea inițială cu `controlState?` și `anomalies?`
 * pentru vizualizarea stării de control și a anomaliilor active.
 */
export interface CognitiveNode {
  nodeKey: string;
  queueName: string;
  neuronType: string;
  swimlane: string;
  status: "ACTIVE" | "PAUSED" | "ERROR";
  metrics: NodeMetrics;
  /** Starea de control runtime (paused flag, applyStatus, concurrency). Opțional pentru compat. */
  controlState?: NodeControlState;
  /** Lista anomaliilor active pentru acest nod în batch-ul curent. Opțional pentru compat. */
  anomalies?: AnomalyRecord[];
}

export interface CognitiveEdge {
  sourceNodeKey: string;
  targetNodeKey: string;
  edgeType: "DATA_FLOW" | "TRIGGER" | "FALLBACK";
  weight: number;
}

/**
 * Eveniment cognitiv emis de un nod via emitCognitiveEvent().
 * Câmpul `id` este prezent când evenimentul este reprodus din DB (Last-Event-ID replay).
 */
export interface CognitiveEvent {
  /** ID bigserial din `bronze.cognitive_events` (prezent la replay din DB). */
  id?: number;
  nodeKey: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Înregistrare de mutație de date din `bronze.data_mutations`.
 * Câmpurile de provenance (`changedFields`, `traceId`, `causationId`, `actorId`)
 * sunt populare de recordDataMutation() când contextul este disponibil.
 */
export interface DataMutationRecord {
  batchId: string;
  nodeKey: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  mutationIntent: "CREATE" | "UPDATE" | "ENRICH" | "PROMOTE";
  timestamp: string;
  /** Câmpurile modificate în această mutație (pentru audit diferențial). */
  changedFields?: string[];
  /** W3C Trace ID asociat mutației. */
  traceId?: string | null;
  /** ID-ul cauzei care a declanșat mutația (ex: job ID, request ID). */
  causationId?: string | null;
  /** ID-ul actorului (user sau worker) care a inițiat mutația. */
  actorId?: string | null;
}
