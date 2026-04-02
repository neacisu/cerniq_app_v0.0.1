/**
 * Cognitive Node Catalog — COMPLETE mapping of all BullMQ queues
 * to the CerniqAPP cognitive brain canvas.
 *
 * Source of truth for queue names: @cerniq/worker-shared queue-registry.ts
 * Static queues cataloged: 252 (65 E1 + 54 E2 + 78 E3 + 55 E4)
 * Skipped: 40 per-phone WA queues (dynamically generated, no QUEUES.* constants)
 * E3: 78 entries (A1-A6 Product Knowledge, B7-B12 Hybrid Search, C13-C18 AI Agent Core,
 *           D19-D26 Negotiation FSM, E27-E32 Pricing/Discount, F33-F38 Stock & Inventory,
 *           G39-G45 Oblio Invoicing, H46-H50 eFactura SPV, I51-I55 Document Generation,
 *           J56-J60 Handover & Channel, K61-K65 Sentiment & Intent, L66-L70 MCP Server,
 *           M71-M75 Guardrails CRITICAL, N76-N78 HITL Human-Oversight)
 * E4: 55 entries (A1-A6 Revolut Payments, B7-B12 Payment Reconciliation,
 *           C13-C18 Credit Scoring, D19-D21 Credit Limits,
 *           E22-E27 Sameday Logistics, F28-F31 Stock Sync,
 *           G32-G36 DocuSign Contracts, H37-H38 Returns,
 *           I39-I44 AlertNeuron, J45-J47 Audit Hash-Chain,
 *           K48-K53 HITL Human-Oversight, +2 pipeline cron)
 * E5: 0 entries (not yet implemented)
 * NOTE: Plan §8h targets 67 E4 entries (14 pipeline workers); only 55 queue names
 *       exist in queue-registry.ts — 12 pipeline queues not yet registered.
 */

// ---------------------------------------------------------------------------
// Enum — 16 neuron types
// ---------------------------------------------------------------------------

export enum NeuronType {
  SensoryNeuron = "SensoryNeuron",
  MotorNeuron = "MotorNeuron",
  DeliberativeNeuron = "DeliberativeNeuron",
  ReflexNeuron = "ReflexNeuron",
  AssociativeNeuron = "AssociativeNeuron",
  ProceduralNeuron = "ProceduralNeuron",
  RulesNeuron = "RulesNeuron",
  AutonomicNeuron = "AutonomicNeuron",
  ExecutiveNeuron = "ExecutiveNeuron",
  AttentionNeuron = "AttentionNeuron",
  EmotionNeuron = "EmotionNeuron",
  KnowledgeNeuron = "KnowledgeNeuron",
  GuardrailNeuron = "GuardrailNeuron",
  HumanNeuron = "HumanNeuron",
  PredictiveNeuron = "PredictiveNeuron",
  ToolNeuron = "ToolNeuron",
  // ── E4 new neuron types ──────────────────────────────────────────────────
  PerceptionNeuron = "PerceptionNeuron",
  ReconciliationNeuron = "ReconciliationNeuron",
  CreditNeuron = "CreditNeuron",
  LimitNeuron = "LimitNeuron",
  LogisticsNeuron = "LogisticsNeuron",
  StockNeuron = "StockNeuron",
  ContractNeuron = "ContractNeuron",
  ReturnNeuron = "ReturnNeuron",
  AlertNeuron = "AlertNeuron",
  ComplianceNeuron = "ComplianceNeuron",
  MetaNeuron = "MetaNeuron",
  MaintenanceNeuron = "MaintenanceNeuron",
  VigilanceNeuron = "VigilanceNeuron",
}

// ---------------------------------------------------------------------------
// Swimlane literal type
// ---------------------------------------------------------------------------

export type Swimlane =
  | "data-ingest"
  | "normalization"
  | "validation"
  | "enrichment-fiscal"
  | "enrichment-external"
  | "ai-analysis"
  | "dedup-scoring"
  | "pipeline-control"
  | "human-oversight"
  | "product-knowledge"
  | "ai-reasoning"
  | "fiscal-execution"
  | "hybrid-search"
  | "negotiation-fsm"
  | "pricing-engine"
  | "stock-management"
  | "human-oversight-e3"
  // ── E4 swimlanes ─────────────────────────────────────────────────────────
  | "payment-processing"
  | "credit-decision"
  | "logistics"
  | "contract-execution"
  | "audit-compliance"
  | "human-oversight-e4"
  | "social-action";

export const SWIMLANES: readonly Swimlane[] = [
  "data-ingest",
  "normalization",
  "validation",
  "enrichment-fiscal",
  "enrichment-external",
  "ai-analysis",
  "dedup-scoring",
  "pipeline-control",
  "human-oversight",
  "product-knowledge",
  "ai-reasoning",
  "fiscal-execution",
  "hybrid-search",
  "negotiation-fsm",
  "pricing-engine",
  "stock-management",
  "human-oversight-e3",
  // E4
  "payment-processing",
  "credit-decision",
  "logistics",
  "contract-execution",
  "audit-compliance",
  "human-oversight-e4",
  "social-action",
] as const;

// ---------------------------------------------------------------------------
// Criticality & Etapa
// ---------------------------------------------------------------------------

export type Criticality = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type Etapa = 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// NodeKind — categoria structurală a nodului în rețeaua cognitivă
// ---------------------------------------------------------------------------

export type NodeKind =
  | "worker"
  | "queue"
  | "external_api"
  | "data_mutation"
  | "endpoint"
  | "function_group";

// ---------------------------------------------------------------------------
// Supporting types pentru metadata extinsă
// ---------------------------------------------------------------------------

/**
 * Definește un API extern utilizat de nodul cognitiv.
 * Permite vizualizarea dependențelor externe și rate-limiting awareness.
 */
export interface ExternalApiDef {
  /** Identificator uman-citibil (ex: "ANAF", "Termene.ro", "Hunter.io") */
  name: string;
  /** URL bază al API-ului extern */
  endpoint?: string;
  /** Număr maxim de cereri permise pe minut */
  rateLimit?: number;
}

/**
 * Configurație de rate-limiting pentru un nod cognitiv.
 * Aplicabilă imediat fără restart worker (immediate-apply).
 */
export interface RateLimitDef {
  requestsPerMinute?: number;
  requestsPerSecond?: number;
  /** Alocare maximă pentru burst scurt (ex: 10 req/s timp de 2s) */
  burstLimit?: number;
}

/**
 * Configurație BullMQ aplicabilă imediat, fără restart worker.
 * Corespunde câmpurilor din BullMQ JobsOptions + thresholds cognitive.
 */
export interface QueueConfig {
  attempts?: number;
  backoff?: { type: "fixed" | "exponential"; delay: number };
  delay?: number;
  priority?: number;
  /** Prag în ms după care un job activ e considerat stale */
  staleThreshold?: number;
  /** SLA heartbeat în ms — dacă worker-ul nu emite în interval, node = ERROR */
  heartbeatSla?: number;
  autoRecoveryPolicy?: "restart" | "drain" | "skip";
}

/**
 * Configurație BullMQ aplicabilă doar la restart worker (supervisor-apply).
 * Necesită coordonarea cu orchestratorul de deployment.
 */
export interface WorkerConfig {
  concurrency?: number;
  /** BullMQ rate limiter { max: N jobs, duration: T ms } */
  limiter?: { max: number; duration: number };
}

// ---------------------------------------------------------------------------
// CognitiveNodeEntry interface
// ---------------------------------------------------------------------------

export interface CognitiveNodeEntry {
  nodeKey: string;
  queueName: string;
  cognitiveFunction: string;
  biologicalAnalogy: string;
  neuronType: NeuronType;
  swimlane: Swimlane;
  etapa: Etapa;
  criticality: Criticality;
  pulsing: boolean;

  // -------------------------------------------------------------------------
  // Câmpuri opționale — backwards compatible, adăugate Faza 2
  // -------------------------------------------------------------------------

  /** Etichetă UI afișată în canvas-ul cognitiv (fallback: nodeKey) */
  displayName?: string;

  /** Categoria structurală a nodului în arhitectura cognitivă */
  nodeKind?: NodeKind;

  /** Lista API-urilor externe pe care le apelează acest nod */
  externalApis?: ExternalApiDef[];

  /** Limitări de rată configurate pentru nod */
  rateLimits?: RateLimitDef;

  /** Configurație aplicabilă imediat prin cognitive control plane */
  immediateApplyConfig?: QueueConfig;

  /**
   * Configurație aplicabilă doar la restart worker.
   * Schimbarea concurrency/limiter necesită coordonare cu orchestratorul.
   */
  supervisorApplyConfig?: WorkerConfig;

  /**
   * true dacă nodul este deprecat/redundant și înlocuit de altul.
   * Ex: D1-D5 sunt înlocuite de D0, ai-intent de ai-sentiment.
   */
  isRedundant?: boolean;

  /**
   * nodeKey-ul nodului care înlocuiește acest nod redundant.
   * Ex: "e1:enrich:anaf-full" pentru D1-D5.
   */
  replacedBy?: string;

  /** Icon Lucide/Phosphor utilizat în UI canvas cognitiv */
  icon?: string;

  /** Hint culoare CSS/HEX pentru vizualizarea swimlane-ului în UI */
  colorHint?: string;
}

// ---------------------------------------------------------------------------
// Biological analogy per neuron type
// ---------------------------------------------------------------------------

const BIOLOGICAL_ANALOGIES: Record<NeuronType, string> = {
  [NeuronType.SensoryNeuron]: "Receptor senzorial — captează stimuli din mediul extern",
  [NeuronType.MotorNeuron]: "Neuron motor — execută acțiuni eferente spre exterior",
  [NeuronType.DeliberativeNeuron]: "Cortex prefrontal — deliberare și raționament profund",
  [NeuronType.ReflexNeuron]: "Arc reflex spinal — răspuns automat fără deliberare",
  [NeuronType.AssociativeNeuron]: "Neuron asociativ cortical — corelează și integrează date",
  [NeuronType.ProceduralNeuron]: "Ganglioni bazali — execuție procedurală pas cu pas",
  [NeuronType.RulesNeuron]: "Cerebel — verificare reguli deterministe",
  [NeuronType.AutonomicNeuron]: "Sistem nervos autonom — mentenanță invizibilă de fundal",
  [NeuronType.ExecutiveNeuron]: "Cortex executiv — orchestrare și coordonare de nivel înalt",
  [NeuronType.AttentionNeuron]: "Formațiune reticulară — vigilență și detectare anomalii",
  [NeuronType.EmotionNeuron]: "Amigdală — procesare tonalitate emoțională",
  [NeuronType.KnowledgeNeuron]: "Hipocamp — stocare și recuperare cunoștințe",
  [NeuronType.GuardrailNeuron]: "Cortex cingulat — gardian al limitelor și siguranței",
  [NeuronType.HumanNeuron]: "Neocortex — decizie conștientă umană obligatorie",
  [NeuronType.PredictiveNeuron]: "Cortex parietal — predicție bazată pe pattern-uri",
  [NeuronType.ToolNeuron]: "Cortex premotor — interfațare cu instrumente externe",
  // ── E4 new types ─────────────────────────────────────────────────────────
  [NeuronType.PerceptionNeuron]: "Receptor financiar — captează semnale de plată din mediul extern",
  [NeuronType.ReconciliationNeuron]:
    "Cortex de reconciliere — potrivire și corelație plăți multi-tier",
  [NeuronType.CreditNeuron]: "Sistem de evaluare credit — scoring financiar bazat pe date reale",
  [NeuronType.LimitNeuron]: "Gatekeeper credit — monitorizare și control limite financiare",
  [NeuronType.LogisticsNeuron]: "Cortex motor logistic — coordonare transport și expediere AWB",
  [NeuronType.StockNeuron]: "Sistem de inventar — sincronizare și gestiune stocuri în timp real",
  [NeuronType.ContractNeuron]:
    "Cortex contractual — generare și execuție contracte digitale DocuSign",
  [NeuronType.ReturnNeuron]: "Circuit de returnare — procesare și inversare tranzacții RMA",
  [NeuronType.AlertNeuron]: "Formațiune de alertă — detectare și notificare evenimente critice",
  [NeuronType.ComplianceNeuron]: "Cortex de conformitate — audit hash-chain și anonimizare GDPR",
  [NeuronType.MetaNeuron]: "Meta-cortex — monitorizare metrici și stare pipeline",
  [NeuronType.MaintenanceNeuron]: "Sistem nervos de mentenanță — curățare și recuperare automată",
  [NeuronType.VigilanceNeuron]: "Vigilence cortex — monitorizare sănătate și alertare proactivă",
};

// ---------------------------------------------------------------------------
// Builder helper (keeps catalog DRY)
// ---------------------------------------------------------------------------

function n(
  nodeKey: string,
  queueName: string,
  cognitiveFunction: string,
  neuronType: NeuronType,
  swimlane: Swimlane,
  etapa: Etapa,
  criticality: Criticality,
): CognitiveNodeEntry {
  return {
    nodeKey,
    queueName,
    cognitiveFunction,
    biologicalAnalogy: BIOLOGICAL_ANALOGIES[neuronType],
    neuronType,
    swimlane,
    etapa,
    criticality,
    pulsing: neuronType === NeuronType.DeliberativeNeuron,
  };
}

// ---------------------------------------------------------------------------
// CATALOG — 118 cognitive neurons
// ---------------------------------------------------------------------------

export const COGNITIVE_NODE_CATALOG: CognitiveNodeEntry[] = [
  // =========================================================================
  // ETAPA 1 — Data Enrichment (64 neurons)
  // =========================================================================

  // A — Ingest (5)
  n(
    "e1:ingest:csv",
    "ingest:csv",
    "Parsare fișiere CSV și extragere date structurate",
    NeuronType.SensoryNeuron,
    "data-ingest",
    1,
    "MEDIUM",
  ),
  n(
    "e1:ingest:excel",
    "ingest:excel",
    "Parsare fișiere Excel (XLS/XLSX)",
    NeuronType.SensoryNeuron,
    "data-ingest",
    1,
    "MEDIUM",
  ),
  n(
    "e1:ingest:webhook",
    "ingest:webhook",
    "Recepție date via webhook HTTP extern",
    NeuronType.SensoryNeuron,
    "data-ingest",
    1,
    "MEDIUM",
  ),
  n(
    "e1:ingest:manual",
    "ingest:manual",
    "Ingestie date introduse manual din UI",
    NeuronType.SensoryNeuron,
    "data-ingest",
    1,
    "LOW",
  ),
  n(
    "e1:ingest:api",
    "ingest:api",
    "Ingestie date via conector API extern",
    NeuronType.SensoryNeuron,
    "data-ingest",
    1,
    "MEDIUM",
  ),

  // B — Normalize (4)
  n(
    "e1:normalize:name",
    "normalize:name",
    "Normalizare nume companie/persoană",
    NeuronType.ProceduralNeuron,
    "normalization",
    1,
    "MEDIUM",
  ),
  n(
    "e1:normalize:address",
    "normalize:address",
    "Normalizare și standardizare adrese",
    NeuronType.ProceduralNeuron,
    "normalization",
    1,
    "MEDIUM",
  ),
  n(
    "e1:normalize:phone",
    "normalize:phone",
    "Normalizare numere de telefon format E.164",
    NeuronType.ProceduralNeuron,
    "normalization",
    1,
    "MEDIUM",
  ),
  n(
    "e1:normalize:email",
    "normalize:email",
    "Normalizare adrese email (lowercase, trim)",
    NeuronType.ProceduralNeuron,
    "normalization",
    1,
    "MEDIUM",
  ),

  // B5 — Enrich Bronze (1)
  n(
    "e1:enrich:bronze-anaf",
    "enrich:bronze:anaf",
    "Îmbogățire inițială date ANAF la nivel bronze",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),

  // C — Validate CUI (2)
  n(
    "e1:validate:cui-mod11",
    "validate:cui:mod11",
    "Validare CUI prin algoritm MOD11 local",
    NeuronType.RulesNeuron,
    "validation",
    1,
    "MEDIUM",
  ),
  n(
    "e1:validate:cui-anaf",
    "validate:cui:anaf",
    "Validare CUI prin interogare ANAF online",
    NeuronType.RulesNeuron,
    "validation",
    1,
    "HIGH",
  ),

  // D0 — Enrich ANAF Full unified (1)
  n(
    "e1:enrich:anaf-full-fetch",
    "enrich:anaf:full",
    "Îmbogățire completă ANAF—D1-D5 într-un singur apel cu cache Redis",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "CRITICAL",
  ),

  // D — Enrich ANAF (5) @deprecated — use D0 (e1:enrich:anaf-full-fetch)
  n(
    "e1:enrich:anaf-fiscal",
    "enrich:anaf:fiscal-status",
    "Verificare stare fiscală companie la ANAF",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:anaf-tva",
    "enrich:anaf:tva-status",
    "Verificare statut plătitor TVA la ANAF",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:anaf-efactura",
    "enrich:anaf:efactura",
    "Verificare statut e-Factura la ANAF",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:anaf-datorii",
    "enrich:anaf:datorii",
    "Verificare datorii fiscale la ANAF",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:anaf-caen",
    "enrich:anaf:caen",
    "Extragere coduri CAEN de la ANAF",
    NeuronType.ToolNeuron,
    "enrichment-fiscal",
    1,
    "HIGH",
  ),

  // E — Enrich Termene (4)
  n(
    "e1:enrich:termene-balance",
    "enrich:termene:balance",
    "Extragere bilanț contabil de la Termene.ro",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:termene-risk",
    "enrich:termene:risk",
    "Evaluare scor risc de la Termene.ro",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:termene-dosare",
    "enrich:termene:dosare",
    "Extragere dosare instanță de la Termene.ro",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:termene-actionari",
    "enrich:termene:actionari",
    "Extragere structură acționariat de la Termene.ro",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),

  // F — Enrich ONRC (3)
  n(
    "e1:enrich:onrc-data",
    "enrich:onrc:data",
    "Extragere date companie de la ONRC",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:onrc-administratori",
    "enrich:onrc:administratori",
    "Extragere administratori de la ONRC",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "HIGH",
  ),
  n(
    "e1:enrich:onrc-sedii",
    "enrich:onrc:sedii",
    "Extragere sedii și puncte de lucru ONRC",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),

  // G — Discover & Enrich Email (6)
  n(
    "e1:discover:email-hunter",
    "discover:email:hunter",
    "Descoperire adrese email via Hunter.io",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:discover:email-hunter-verify",
    "discover:email:hunter-verify",
    "Verificare email descoperit cu Hunter.io",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:discover:email-zerobounce",
    "discover:email:zerobounce",
    "Validare email cu ZeroBounce",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:enrich:email-enricher",
    "enrich:email:enricher",
    "Îmbogățire date asociate adresei email",
    NeuronType.AssociativeNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:discover:email-pattern",
    "discover:email:pattern",
    "Descoperire pattern email din domeniu",
    NeuronType.ProceduralNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:discover:email-generate",
    "discover:email:generate",
    "Generare adrese email candidate",
    NeuronType.ProceduralNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),

  // H — Phone Enrichment (3)
  n(
    "e1:enrich:phone-normalize",
    "enrich:phone:normalize",
    "Normalizare format telefon internațional E.164",
    NeuronType.ProceduralNeuron,
    "normalization",
    1,
    "MEDIUM",
  ),
  n(
    "e1:enrich:phone-hlr",
    "enrich:phone:hlr",
    "Verificare HLR validitate număr telefon",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:enrich:phone-carrier",
    "enrich:phone:carrier",
    "Identificare operator telefonie mobilă",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),

  // I — Scraping (4)
  n(
    "e1:scrape:legal-daj",
    "scrape:legal:daj",
    "Scraping date juridice de la DAJ",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:scrape:legal-anif",
    "scrape:legal:anif",
    "Scraping date de la ANIF",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:scrape:website-finder",
    "scrape:website:finder",
    "Descoperire website oficial companie",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:scrape:website-contact",
    "scrape:website:contact-page",
    "Extragere date contact de pe website",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),

  // J — AI E1 (4)
  n(
    "e1:ai:structure-xai",
    "ai:structure:xai",
    "Structurare date nestructurate cu AI xAI",
    NeuronType.DeliberativeNeuron,
    "ai-analysis",
    1,
    "HIGH",
  ),
  n(
    "e1:ai:merge-xai",
    "ai:merge:xai",
    "Fuzionare inteligentă date duplicate cu AI xAI",
    NeuronType.DeliberativeNeuron,
    "ai-analysis",
    1,
    "HIGH",
  ),
  n(
    "e1:ai:score-confidence",
    "ai:score:confidence",
    "Scoring nivel încredere predicții AI",
    NeuronType.PredictiveNeuron,
    "ai-analysis",
    1,
    "MEDIUM",
  ),
  n(
    "e1:ai:fallback",
    "ai:fallback",
    "Fallback AI la provider secundar la eroare",
    NeuronType.ReflexNeuron,
    "ai-analysis",
    1,
    "HIGH",
  ),

  // K — Geo (3)
  n(
    "e1:geo:geocode-nominatim",
    "geo:geocode:nominatim",
    "Geocodificare adrese cu Nominatim/OSM",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),
  n(
    "e1:geo:zones-postgis",
    "geo:zones:postgis",
    "Determinare zone geografice cu PostGIS",
    NeuronType.KnowledgeNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),
  n(
    "e1:geo:proximity",
    "geo:proximity",
    "Calcul proximitate geografică între entități",
    NeuronType.AssociativeNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),

  // L — Agri (5)
  n(
    "e1:agri:apia",
    "agri:apia",
    "Verificare date subvenții APIA",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:agri:ouai",
    "agri:ouai",
    "Verificare date OUAI (organizare udare/ameliorare irigare)",
    NeuronType.ToolNeuron,
    "enrichment-external",
    1,
    "MEDIUM",
  ),
  n(
    "e1:agri:cooperative",
    "agri:cooperative",
    "Înregistrare date cooperative agricole",
    NeuronType.KnowledgeNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),
  n(
    "e1:agri:culturi",
    "agri:culturi",
    "Catalogare culturi agricole per fermier",
    NeuronType.KnowledgeNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),
  n(
    "e1:agri:animale",
    "agri:animale",
    "Catalogare efectiv animale per fermier",
    NeuronType.KnowledgeNeuron,
    "enrichment-external",
    1,
    "LOW",
  ),

  // M — Dedup (2)
  n(
    "e1:dedup:exact",
    "dedup:exact",
    "Deduplicare prin potrivire exactă (CUI, email)",
    NeuronType.AssociativeNeuron,
    "dedup-scoring",
    1,
    "MEDIUM",
  ),
  n(
    "e1:dedup:fuzzy",
    "dedup:fuzzy",
    "Deduplicare prin potrivire fuzzy (Levenshtein, n-grame)",
    NeuronType.AssociativeNeuron,
    "dedup-scoring",
    1,
    "MEDIUM",
  ),

  // N — Score (3)
  n(
    "e1:score:completeness",
    "score:completeness",
    "Scoring completitudine date per lead",
    NeuronType.PredictiveNeuron,
    "dedup-scoring",
    1,
    "MEDIUM",
  ),
  n(
    "e1:score:accuracy",
    "score:accuracy",
    "Scoring acuratețe și validitate date",
    NeuronType.PredictiveNeuron,
    "dedup-scoring",
    1,
    "MEDIUM",
  ),
  n(
    "e1:score:freshness",
    "score:freshness",
    "Scoring prospețime/actualitate date",
    NeuronType.PredictiveNeuron,
    "dedup-scoring",
    1,
    "LOW",
  ),

  // O — Aggregate (2)
  n(
    "e1:aggregate:daily-stats",
    "aggregate:daily-stats",
    "Agregare statistici zilnice pipeline",
    NeuronType.ProceduralNeuron,
    "dedup-scoring",
    1,
    "LOW",
  ),
  n(
    "e1:aggregate:quality-rollup",
    "aggregate:quality-rollup",
    "Agregare indicatori calitate date",
    NeuronType.ProceduralNeuron,
    "dedup-scoring",
    1,
    "LOW",
  ),

  // P — Pipeline Control (5)
  n(
    "e1:pipeline:orchestrate",
    "pipeline:orchestrate",
    "Orchestrare pipeline principal E1",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    1,
    "CRITICAL",
  ),
  n(
    "e1:pipeline:promote-gold",
    "pipeline:promote:gold",
    "Promovare date Silver → Gold",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    1,
    "CRITICAL",
  ),
  n(
    "e1:pipeline:promote-bronze-silver",
    "pipeline:promote:bronze-silver",
    "Promovare date Bronze → Silver",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    1,
    "CRITICAL",
  ),
  n(
    "e1:pipeline:monitor",
    "pipeline:monitor",
    "Monitorizare stare pipeline E1",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    1,
    "HIGH",
  ),
  n(
    "e1:pipeline:error-handler",
    "pipeline:error-handler",
    "Gestionare erori pipeline E1",
    NeuronType.ReflexNeuron,
    "pipeline-control",
    1,
    "CRITICAL",
  ),

  // Q — HITL E1 (2)
  n(
    "e1:hitl:escalate",
    "hitl:escalate",
    "Escaladare task către operator uman",
    NeuronType.HumanNeuron,
    "human-oversight",
    1,
    "CRITICAL",
  ),
  n(
    "e1:hitl:resume",
    "hitl:resume",
    "Reluare flux automat după aprobare umană",
    NeuronType.HumanNeuron,
    "human-oversight",
    1,
    "CRITICAL",
  ),

  // R — Maintenance (1)
  n(
    "e1:maintenance:import-cleanup",
    "maintenance:import-file-cleanup",
    "Curățare fișiere import temporare de pe disk",
    NeuronType.AutonomicNeuron,
    "pipeline-control",
    1,
    "LOW",
  ),

  // =========================================================================
  // ETAPA 2 — Cold Outreach Multi-Canal (54 neurons)
  // =========================================================================

  // A — Quota Guardian (4)
  n(
    "e2:quota:guardian-check",
    "quota:guardian:check",
    "Verificare cotă zilnică disponibilă înainte de trimitere",
    NeuronType.GuardrailNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:quota:guardian-increment",
    "quota:guardian:increment",
    "Incrementare contor cotă utilizată după trimitere",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:quota:guardian-reset",
    "quota:guardian:reset",
    "Resetare automată contoare cote la miezul nopții",
    NeuronType.AutonomicNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:quota:business-hours",
    "quota:business-hours:check",
    "Verificare dacă este în ore de program pentru trimitere",
    NeuronType.RulesNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),

  // B — Orchestration (4)
  n(
    "e2:outreach:orchestrator-dispatch",
    "outreach:orchestrator:dispatch",
    "Dispatch mesaje outreach către canale",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    2,
    "CRITICAL",
  ),
  n(
    "e2:outreach:orchestrator-router",
    "outreach:orchestrator:router",
    "Rutare mesaje pe canalul optim",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    2,
    "CRITICAL",
  ),
  n(
    "e2:outreach:phone-allocator",
    "outreach:phone:allocator",
    "Alocare număr telefon pentru trimitere WA",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:outreach:channel-selector",
    "outreach:channel:selector",
    "Selecție canal optim (WA/email/SMS)",
    NeuronType.RulesNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),

  // C — WhatsApp non-per-phone (5)
  n(
    "e2:wa:reply",
    "q:wa:reply",
    "Trimitere răspuns WhatsApp către lead",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "HIGH",
  ),
  n(
    "e2:wa:message-retry",
    "wa:message:retry",
    "Reîncercare mesaj WhatsApp eșuat",
    NeuronType.ReflexNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:wa:chat-history",
    "wa:chat:history:fetch",
    "Recuperare istoric conversații WhatsApp",
    NeuronType.SensoryNeuron,
    "data-ingest",
    2,
    "LOW",
  ),
  n(
    "e2:wa:status-sync",
    "wa:status:sync",
    "Sincronizare status mesaje WhatsApp",
    NeuronType.AutonomicNeuron,
    "pipeline-control",
    2,
    "LOW",
  ),
  n(
    "e2:wa:media-send",
    "wa:media:send",
    "Trimitere fișiere media via WhatsApp",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "MEDIUM",
  ),

  // D — Email Cold (5)
  n(
    "e2:email:cold-send",
    "q:email:cold",
    "Trimitere email cold outreach via Instantly",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "HIGH",
  ),
  n(
    "e2:email:cold-campaign-create",
    "email:cold:campaign:create",
    "Creare campanie email cold în Instantly",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:email:cold-campaign-pause",
    "email:cold:campaign:pause",
    "Pauză/oprire campanie email cold",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:email:cold-analytics",
    "email:cold:analytics:fetch",
    "Extragere metrici performanță campanie email",
    NeuronType.SensoryNeuron,
    "dedup-scoring",
    2,
    "LOW",
  ),
  n(
    "e2:email:cold-lead-status",
    "email:cold:lead:status",
    "Sincronizare status lead din platforma email",
    NeuronType.AssociativeNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),

  // E — Email Warm (3)
  n(
    "e2:email:warm-send",
    "q:email:warm",
    "Trimitere email warm personalizat via Resend",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "HIGH",
  ),
  n(
    "e2:email:warm-proforma",
    "email:warm:proforma",
    "Trimitere proformă via email warm",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "HIGH",
  ),
  n(
    "e2:email:warm-document",
    "email:warm:document",
    "Trimitere documente atașate via email warm",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    2,
    "MEDIUM",
  ),

  // F — Template Processing (3)
  n(
    "e2:template:spintax",
    "template:spintax:process",
    "Procesare spintax pentru variație text mesaje",
    NeuronType.ProceduralNeuron,
    "normalization",
    2,
    "MEDIUM",
  ),
  n(
    "e2:template:personalize",
    "template:personalize",
    "Personalizare template cu date specifice lead",
    NeuronType.ProceduralNeuron,
    "normalization",
    2,
    "MEDIUM",
  ),
  n(
    "e2:template:validate",
    "template:validate",
    "Validare template (lungime, variabile, limbaj)",
    NeuronType.RulesNeuron,
    "validation",
    2,
    "MEDIUM",
  ),

  // G — Webhook Ingest (4)
  n(
    "e2:webhook:timelinesai",
    "webhook:timelinesai:ingest",
    "Recepție webhook-uri TimelinesAI (WA events)",
    NeuronType.SensoryNeuron,
    "data-ingest",
    2,
    "HIGH",
  ),
  n(
    "e2:webhook:instantly",
    "webhook:instantly:ingest",
    "Recepție webhook-uri Instantly (email events)",
    NeuronType.SensoryNeuron,
    "data-ingest",
    2,
    "HIGH",
  ),
  n(
    "e2:webhook:resend",
    "webhook:resend:ingest",
    "Recepție webhook-uri Resend (email warm events)",
    NeuronType.SensoryNeuron,
    "data-ingest",
    2,
    "HIGH",
  ),
  n(
    "e2:webhook:normalize",
    "webhook:normalize",
    "Normalizare payload webhook uniform",
    NeuronType.ProceduralNeuron,
    "normalization",
    2,
    "MEDIUM",
  ),

  // H — Sequences (4)
  n(
    "e2:sequence:schedule-followup",
    "sequence:schedule:followup",
    "Programare follow-up automat în secvență",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:sequence:stop",
    "sequence:stop",
    "Oprire secvență outreach pentru un lead",
    NeuronType.ExecutiveNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:sequence:advance",
    "sequence:advance",
    "Avansare la pasul următor în secvență",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:sequence:create",
    "sequence:create",
    "Creare secvență nouă de outreach multi-pas",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),

  // I — Lead State Machine (3)
  n(
    "e2:lead:state-transition",
    "lead:state:transition",
    "Tranziție stare lead în mașina de stări FSM",
    NeuronType.ProceduralNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:lead:state-validate",
    "lead:state:validate",
    "Validare tranziție stare lead (reguli de business)",
    NeuronType.RulesNeuron,
    "validation",
    2,
    "HIGH",
  ),
  n(
    "e2:lead:assign-user",
    "lead:assign:user",
    "Asignare lead către utilizator/agent",
    NeuronType.ExecutiveNeuron,
    "human-oversight",
    2,
    "MEDIUM",
  ),

  // J — AI E2 (3)
  n(
    "e2:ai:sentiment-analyze",
    "ai:sentiment:analyze",
    "Analiză sentiment mesaje primite de la lead",
    NeuronType.EmotionNeuron,
    "ai-analysis",
    2,
    "HIGH",
  ),
  n(
    "e2:ai:response-generate",
    "ai:response:generate",
    "Generare răspuns AI personalizat pentru lead",
    NeuronType.DeliberativeNeuron,
    "ai-reasoning",
    2,
    "HIGH",
  ),
  n(
    "e2:ai:intent-classify",
    "ai:intent:classify",
    "Clasificare intenție mesaj primit (interesat/refuz/…)",
    NeuronType.DeliberativeNeuron,
    "ai-analysis",
    2,
    "HIGH",
  ),

  // K — Monitoring & Alerts (6)
  n(
    "e2:monitor:phone-health",
    "monitor:phone:health",
    "Monitorizare sănătate telefoane WhatsApp",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:monitor:email-deliverability",
    "monitor:email:deliverability",
    "Monitorizare deliverability domenii email",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:monitor:quota-usage",
    "monitor:quota:usage",
    "Monitorizare nivel utilizare cote zilnice",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),
  n(
    "e2:alert:phone-offline",
    "alert:phone:offline",
    "Alertă telefon WhatsApp deconectat",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:alert:phone-banned",
    "alert:phone:banned",
    "Alertă telefon WhatsApp banat de Meta",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "CRITICAL",
  ),
  n(
    "e2:alert:bounce-high",
    "alert:bounce:high",
    "Alertă bounce rate email depășit prag",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),

  // L — HITL / Human Review (7)
  n(
    "e2:human:review-queue",
    "human:review:queue",
    "Coadă mesaje pentru review operator uman",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "HIGH",
  ),
  n(
    "e2:human:review-assign",
    "human:review:assign",
    "Asignare task review către operator disponibil",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "MEDIUM",
  ),
  n(
    "e2:human:takeover-initiate",
    "human:takeover:initiate",
    "Inițiere preluare conversație de la AI de om",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "CRITICAL",
  ),
  n(
    "e2:human:takeover-complete",
    "human:takeover:complete",
    "Finalizare preluare și predare înapoi la AI",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "HIGH",
  ),
  n(
    "e2:human:approve-message",
    "human:approve:message",
    "Aprobare mesaj generat de AI înainte de trimitere",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "HIGH",
  ),
  n(
    "e2:human:review-escalation",
    "human:review:escalation",
    "Escaladare review la nivel superior",
    NeuronType.HumanNeuron,
    "human-oversight",
    2,
    "HIGH",
  ),
  n(
    "e2:human:audit-log",
    "human:review:audit-log",
    "Înregistrare audit trail acțiuni umane",
    NeuronType.KnowledgeNeuron,
    "human-oversight",
    2,
    "LOW",
  ),

  // Outreach Pipeline (2)
  n(
    "e2:pipeline:outreach-health",
    "pipeline:outreach:health",
    "Monitorizare sănătate pipeline outreach",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "HIGH",
  ),
  n(
    "e2:pipeline:outreach-metrics",
    "pipeline:outreach:metrics",
    "Colectare și agregare metrici outreach",
    NeuronType.AttentionNeuron,
    "pipeline-control",
    2,
    "MEDIUM",
  ),

  // DLQ (1)
  n(
    "e2:dlq:outreach",
    "dlq:outreach",
    "Dead letter queue — mesaje outreach eșuate definitiv",
    NeuronType.ReflexNeuron,
    "pipeline-control",
    2,
    "CRITICAL",
  ),

  // =========================================================================
  // ETAPA 3 — AI Sales Engine (78 neurons)
  // =========================================================================

  // A — Product Knowledge (A1-A6)
  n(
    "e3:product:ingest",
    "product:ingest",
    "UPSERT produs în goldProducts — creare sau actualizare SKU",
    NeuronType.ProceduralNeuron,
    "product-knowledge",
    3,
    "HIGH",
  ),
  n(
    "e3:product:embed",
    "product:embed",
    "Generare embeddings vectoriale pentru produse via LLM",
    NeuronType.DeliberativeNeuron,
    "product-knowledge",
    3,
    "HIGH",
  ),
  n(
    "e3:product:chunk",
    "product:chunk",
    "Segmentare text produs în chunk-uri optimizate pentru RAG",
    NeuronType.ProceduralNeuron,
    "product-knowledge",
    3,
    "MEDIUM",
  ),
  n(
    "e3:product:index-rebuild",
    "product:index:rebuild",
    "Reconstruire index vector pgvector pentru catalog produse",
    NeuronType.AutonomicNeuron,
    "product-knowledge",
    3,
    "HIGH",
  ),
  n(
    "e3:product:category-sync",
    "product:category:sync",
    "Sincronizare categorii produse cu taxonomia globală",
    NeuronType.ProceduralNeuron,
    "product-knowledge",
    3,
    "MEDIUM",
  ),
  n(
    "e3:product:variant-process",
    "product:variant:process",
    "Procesare variante produs (dimensiuni, culori, configurații)",
    NeuronType.ProceduralNeuron,
    "product-knowledge",
    3,
    "MEDIUM",
  ),

  // B — Hybrid Search (B7-B12)
  n(
    "e3:search:query-rewrite",
    "search:query:rewrite",
    "Rescriere interogare naturală în formă optimizată pentru search hybrid",
    NeuronType.DeliberativeNeuron,
    "hybrid-search",
    3,
    "HIGH",
  ),
  n(
    "e3:search:vector-execute",
    "search:vector:execute",
    "Execuție căutare vectorială pgvector cu top-K nearest neighbors",
    NeuronType.ToolNeuron,
    "hybrid-search",
    3,
    "HIGH",
  ),
  n(
    "e3:search:bm25-execute",
    "search:bm25:execute",
    "Execuție căutare BM25 full-text pentru scoring keyword",
    NeuronType.ToolNeuron,
    "hybrid-search",
    3,
    "HIGH",
  ),
  n(
    "e3:search:rrf-fuse",
    "search:rrf:fuse",
    "Fuzionare rezultate vector+BM25 prin Reciprocal Rank Fusion",
    NeuronType.AssociativeNeuron,
    "hybrid-search",
    3,
    "HIGH",
  ),
  n(
    "e3:search:filter-apply",
    "search:filter:apply",
    "Aplicare filtre post-retrieval (preț, categorie, stoc, disponibilitate)",
    NeuronType.RulesNeuron,
    "hybrid-search",
    3,
    "MEDIUM",
  ),
  n(
    "e3:search:cache-manage",
    "search:cache:manage",
    "Gestionare cache Redis pentru interogări frecvente de search",
    NeuronType.AutonomicNeuron,
    "hybrid-search",
    3,
    "LOW",
  ),

  // C — AI Agent Core (C13-C18)
  n(
    "e3:ai:context-build",
    "ai:context:build",
    "Construcție fereastră de context pentru agentul AI (profil lead + produse + istoric negociere)",
    NeuronType.DeliberativeNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:ai:agent-orchestrate",
    "ai:agent:orchestrate",
    "Orchestrare agent AI B2B — selecție tool-uri, planificare răspuns",
    NeuronType.ExecutiveNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:ai:response-generate",
    "ai:response:generate",
    "Generare răspuns comercial AI adaptat contextului de negociere",
    NeuronType.DeliberativeNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:ai:response-validate",
    "ai:response:validate",
    "Validare răspuns AI — guardrails conținut, hallucination check, tone",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:ai:conversation-store",
    "ai:conversation:store",
    "Persistare turn conversație AI în aiConversationMessages",
    NeuronType.KnowledgeNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:ai:retry-regenerate",
    "ai:retry:regenerate",
    "Regenerare răspuns AI după reject validare sau timeout",
    NeuronType.ReflexNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),

  // D — Negotiation FSM (D19-D26)
  n(
    "e3:negotiation:state-transition",
    "negotiation:state:transition",
    "Tranziție FSM negociere B2B — aplicare regulă de business și schimbare stare",
    NeuronType.ProceduralNeuron,
    "negotiation-fsm",
    3,
    "CRITICAL",
  ),
  n(
    "e3:negotiation:history-log",
    "negotiation:history:log",
    "Înregistrare eveniment în istoricul complet al negocierii",
    NeuronType.KnowledgeNeuron,
    "negotiation-fsm",
    3,
    "MEDIUM",
  ),
  n(
    "e3:negotiation:items-update",
    "negotiation:items:update",
    "Actualizare linii negociere (produse, cantități, prețuri convenite)",
    NeuronType.ProceduralNeuron,
    "negotiation-fsm",
    3,
    "HIGH",
  ),
  n(
    "e3:negotiation:reminder-send",
    "negotiation:reminder:send",
    "Trimitere reminder automat la lead pentru negocieri în așteptare",
    NeuronType.MotorNeuron,
    "negotiation-fsm",
    3,
    "MEDIUM",
  ),
  n(
    "e3:negotiation:expire-check",
    "negotiation:expire:check",
    "Detectare negocieri expirate și tranziție automată la starea EXPIRED",
    NeuronType.AttentionNeuron,
    "negotiation-fsm",
    3,
    "HIGH",
  ),
  n(
    "e3:negotiation:close-execute",
    "negotiation:close:execute",
    "Execuție închidere negociere — generare comandă, notificări, cleanup",
    NeuronType.ExecutiveNeuron,
    "negotiation-fsm",
    3,
    "CRITICAL",
  ),
  n(
    "e3:negotiation:reopen-request",
    "negotiation:reopen:request",
    "Procesare cerere de redeschidere negociere finalizată",
    NeuronType.ProceduralNeuron,
    "negotiation-fsm",
    3,
    "HIGH",
  ),
  n(
    "e3:negotiation:abandon-process",
    "negotiation:abandon:process",
    "Procesare abandon negociere — cleanup rezervări stoc, notificări",
    NeuronType.ExecutiveNeuron,
    "negotiation-fsm",
    3,
    "HIGH",
  ),

  // E — Pricing / Discount (E27-E32)
  n(
    "e3:pricing:discount-calculate",
    "pricing:discount:calculate",
    "Calcul discount eligibil bazat pe volum, segment, politică comercială",
    NeuronType.PredictiveNeuron,
    "pricing-engine",
    3,
    "HIGH",
  ),
  n(
    "e3:pricing:discount-apply",
    "pricing:discount:apply",
    "Aplicare discount calculat la liniile de negociere",
    NeuronType.ProceduralNeuron,
    "pricing-engine",
    3,
    "HIGH",
  ),
  n(
    "e3:pricing:discount-approve",
    "pricing:discount:approve",
    "Aprobare umană pentru discounturi care depășesc pragul automat",
    NeuronType.HumanNeuron,
    "pricing-engine",
    3,
    "HIGH",
  ),
  n(
    "e3:pricing:margin-check",
    "pricing:margin:check",
    "Verificare marjă minimă asigurată — guardrail pentru prețuri sub cost",
    NeuronType.GuardrailNeuron,
    "pricing-engine",
    3,
    "CRITICAL",
  ),
  n(
    "e3:pricing:volume-calculate",
    "pricing:volume:calculate",
    "Calcul prețuri pe volume/tier (bracket pricing) pentru comenzi mari",
    NeuronType.PredictiveNeuron,
    "pricing-engine",
    3,
    "HIGH",
  ),
  n(
    "e3:pricing:competitor-check",
    "pricing:competitor:check",
    "Verificare preț față de concurență pentru ajustare competitivă",
    NeuronType.AttentionNeuron,
    "pricing-engine",
    3,
    "MEDIUM",
  ),

  // F — Stock & Inventory (F33-F38)
  n(
    "e3:stock:realtime-check",
    "stock:realtime:check",
    "Verificare stoc disponibil în timp real înainte de confirmare negociere",
    NeuronType.SensoryNeuron,
    "stock-management",
    3,
    "HIGH",
  ),
  n(
    "e3:stock:reserve-create",
    "stock:reserve:create",
    "Creare rezervare stoc pentru ofertă activă în negociere",
    NeuronType.ProceduralNeuron,
    "stock-management",
    3,
    "HIGH",
  ),
  n(
    "e3:stock:reserve-release",
    "stock:reserve:release",
    "Eliberare rezervare stoc la abandon sau expirare negociere",
    NeuronType.ProceduralNeuron,
    "stock-management",
    3,
    "HIGH",
  ),
  n(
    "e3:stock:sync-erp",
    "stock:sync:erp",
    "Sincronizare stoc curent din ERP extern la interval definit",
    NeuronType.ToolNeuron,
    "stock-management",
    3,
    "HIGH",
  ),
  n(
    "e3:stock:low-alert",
    "stock:low:alert",
    "Alertă stoc scăzut sub pragul de reaprovizionare setat",
    NeuronType.AttentionNeuron,
    "stock-management",
    3,
    "MEDIUM",
  ),
  n(
    "e3:stock:replenish-request",
    "stock:replenish:request",
    "Lansare cerere automată de reaprovizionare la furnizor",
    NeuronType.MotorNeuron,
    "stock-management",
    3,
    "MEDIUM",
  ),

  // G — Oblio Invoicing (G39-G45)
  n(
    "e3:oblio:proforma-create",
    "oblio:proforma:create",
    "Creare proformă în Oblio la închidere negociere — interfațare API Oblio",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:oblio:proforma-update",
    "oblio:proforma:update",
    "Actualizare proformă existentă în Oblio la modificare negociere",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "MEDIUM",
  ),
  n(
    "e3:oblio:invoice-create",
    "oblio:invoice:create",
    "Emitere factură finală în Oblio după confirmare client",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "CRITICAL",
  ),
  n(
    "e3:oblio:invoice-cancel",
    "oblio:invoice:cancel",
    "Anulare factură în Oblio la abandon sau stornare",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:oblio:client-validate",
    "oblio:client:validate",
    "Validare client în Oblio — verificare existență și date fiscale sincronizate",
    NeuronType.RulesNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:oblio:stock-sync",
    "oblio:stock:sync",
    "Sincronizare stoc Oblio cu stocul intern după emitere factură",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:oblio:webhook-process",
    "oblio:webhook:process",
    "Procesare webhook Oblio — actualizare status documente după confirmare",
    NeuronType.SensoryNeuron,
    "fiscal-execution",
    3,
    "MEDIUM",
  ),

  // H — eFactura SPV via Oblio (H46-H50) — AutonomicNeuron SAFETY-NET
  n(
    "e3:einvoice:send",
    "einvoice:send",
    "Trimitere factură în SPV ANAF via Oblio API — obligație fiscală 5 zile",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "CRITICAL",
  ),
  n(
    "e3:einvoice:status-check",
    "einvoice:status:check",
    "Verificare status SPV — PENDING/VALID/REJECTED după trimitere eFactură",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:einvoice:deadline-monitor",
    "einvoice:deadline:monitor",
    "Monitor CRON zilnic — detectare facturi cu risc depășire 5 zile SPV (amendă 15-20%)",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "CRITICAL",
  ),
  n(
    "e3:einvoice:archive-download",
    "einvoice:archive:download",
    "Descărcare arhivă ZIP cu XML eFactura validat din portalul ANAF",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "MEDIUM",
  ),
  n(
    "e3:einvoice:retry-failed",
    "einvoice:retry:failed",
    "Retrimitere automată eFacturi respinse ANAF — CRON recuperare erori SPV",
    NeuronType.AutonomicNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),

  // I — Document Generation (I51-I55) — MotorNeuron
  n(
    "e3:document:pdf-generate",
    "document:pdf:generate",
    "Generare PDF ofertă/proformă/factură din template Handlebars cu date negociere",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:document:email-send",
    "document:email:send",
    "Trimitere document fiscal/comercial via email (SendGrid/SMTP) cu tracking",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),
  n(
    "e3:document:whatsapp-send",
    "document:whatsapp:send",
    "Trimitere document via WhatsApp Business API ca mesaj media (PDF/link)",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "MEDIUM",
  ),
  n(
    "e3:document:template-compile",
    "document:template:compile",
    "Compilare template document Handlebars cu date negociere/factură pentru PDF",
    NeuronType.ProceduralNeuron,
    "fiscal-execution",
    3,
    "MEDIUM",
  ),
  n(
    "e3:document:archive-store",
    "document:archive:store",
    "Arhivare document final în S3/MinIO cu metadate auditabile și hash integritate",
    NeuronType.MotorNeuron,
    "fiscal-execution",
    3,
    "HIGH",
  ),

  // J — Handover & Channel Routing (J56-J60) — AttentionNeuron / MotorNeuron
  n(
    "e3:handover:detect",
    "handover:detect",
    "Detectare semnale transfer AI→uman: sentiment negativ persistent, blocaj, cerere explicită",
    NeuronType.AttentionNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:handover:context-load",
    "handover:context:load",
    "Încărcare context complet negociere pentru operatorul uman la preluare HITL",
    NeuronType.AssociativeNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:channel:route-decide",
    "channel:route:decide",
    "Decizie canal comunicare optim: WhatsApp / email / apel în funcție de context client",
    NeuronType.ExecutiveNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:channel:whatsapp-send",
    "channel:whatsapp:send",
    "Trimitere mesaj WhatsApp Business — răspuns AI sau notificare comercială client",
    NeuronType.MotorNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:channel:email-send",
    "channel:email:send",
    "Trimitere email comercial — ofertă, follow-up, confirmare negociere",
    NeuronType.MotorNeuron,
    "ai-reasoning",
    3,
    "MEDIUM",
  ),

  // K — Sentiment & Intent Analysis (K61-K65) — EmotionNeuron / AssociativeNeuron
  n(
    "e3:sentiment:analyze",
    "sentiment:analyze",
    "Analiză sentiment mesaj client: pozitiv/neutru/negativ cu scor [-1, 1] via LLM",
    NeuronType.EmotionNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:intent:classify",
    "intent:classify",
    "Clasificare intenție client: cumpărare, negociere, obiecție, abandon, suport",
    NeuronType.AssociativeNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:objection:detect",
    "objection:detect",
    "Detectare și catalogare obiecții comerciale pentru răspuns AI adaptat contextual",
    NeuronType.EmotionNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:sentiment:trend-analyze",
    "sentiment:trend:analyze",
    "Analiză trend sentiment pe sesiune — detectare deteriorare persistentă (trigger HITL)",
    NeuronType.EmotionNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:feedback:collect",
    "feedback:collect",
    "Colectare feedback post-negociere — NPS, rating, comentariu liber pentru quality",
    NeuronType.AssociativeNeuron,
    "ai-reasoning",
    3,
    "MEDIUM",
  ),

  // L — MCP Server (L66-L70) — ToolNeuron / AttentionNeuron
  n(
    "e3:mcp:resource-load",
    "mcp:resource:load",
    "Încărcare MCP Resource (produs, client, conversație) cu cache Redis TTL 5min",
    NeuronType.ToolNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:mcp:tool-register",
    "mcp:tool:register",
    "Înregistrare tool MCP în registry — disponibil agentului AI la runtime pentru apel",
    NeuronType.ToolNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:mcp:session-manage",
    "mcp:session:manage",
    "Management sesiune MCP: creare, refresh token, close la timeout sau inactivitate",
    NeuronType.ToolNeuron,
    "ai-reasoning",
    3,
    "HIGH",
  ),
  n(
    "e3:mcp:health-check",
    "mcp:health:check",
    "Verificare sănătate server MCP — detectare latență crescută sau erori conexiune",
    NeuronType.AttentionNeuron,
    "ai-reasoning",
    3,
    "MEDIUM",
  ),
  n(
    "e3:mcp:metrics-collect",
    "mcp:metrics:collect",
    "Colectare metrici MCP: latență, throughput, erori per tool pentru Prometheus",
    NeuronType.AutonomicNeuron,
    "ai-reasoning",
    3,
    "MEDIUM",
  ),

  // M — Guardrails Zero Hallucination (M71-M75) — GuardrailNeuron CRITICAL
  n(
    "e3:guardrail:price-check",
    "guardrail:price:check",
    "Guardrail DETERMINISTIC preț: blocare preț oferit < cost × 1.05 (marjă minimă)",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:guardrail:stock-check",
    "guardrail:stock:check",
    "Guardrail DETERMINISTIC stoc: blocare confirmare dacă stoc disponibil < cantitate cerută",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:guardrail:discount-check",
    "guardrail:discount:check",
    "Guardrail DETERMINISTIC discount: blocare >50%, escaladare la director >30%",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:guardrail:sku-validate",
    "guardrail:sku:validate",
    "Guardrail DETERMINISTIC SKU: blocare răspuns dacă produsul menționat nu există în catalog",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),
  n(
    "e3:guardrail:fiscal-validate",
    "guardrail:fiscal:validate",
    "Guardrail DETERMINISTIC fiscal: verificare CUI valid și client activ în registrul ANAF",
    NeuronType.GuardrailNeuron,
    "ai-reasoning",
    3,
    "CRITICAL",
  ),

  // N — HITL Human-In-The-Loop E3 (N76-N78) — HumanNeuron
  n(
    "e3:human:escalate",
    "human:escalate",
    "Escaladare AI→uman: guardrail 3x fail / discount >30% / sentiment <-0.5 / cerere client / AI confidence <0.3",
    NeuronType.HumanNeuron,
    "human-oversight-e3",
    3,
    "CRITICAL",
  ),
  n(
    "e3:human:takeover",
    "human:takeover",
    "Transfer control AI→operator uman — marcare conversație handed_off, AI rămâne co-pilot background",
    NeuronType.HumanNeuron,
    "human-oversight-e3",
    3,
    "HIGH",
  ),
  n(
    "e3:human:approve",
    "human:approve",
    "Procesare decizie umană APPROVE/REJECT/MODIFY — execuție acțiune pendingă, log history triggered_by_type=user",
    NeuronType.HumanNeuron,
    "human-oversight-e3",
    3,
    "HIGH",
  ),

  // =========================================================================
  // ETAPA 4 — Post-Sale: Payments, Logistics, Credit, Contracts, Audit, HITL
  // 55 entries total: A1-A6 + B7-B12 + C13-C18 + D19-D21 + E22-E27 + F28-F31
  //                   + G32-G36 + H37-H38 + I39-I44 + J45-J47 + K48-K53 + 2 cron
  // Queue names are identical to QUEUES.E4_* in queue-registry.ts
  // NOTE: Plan targets 67 entries; 55 implemented (12 pipeline queues not yet registered)
  // =========================================================================

  // A — Revolut Payments & Webhooks (PerceptionNeuron, swimlane: payment-processing)
  n(
    "e4:revolut:webhook-ingest",
    "revolut:webhook:ingest",
    "Ingest Revolut webhook cu idempotency Redis SET NX EX 86400 — enqueue A2+A6",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:revolut:transaction-process",
    "revolut:transaction:process",
    "Procesare tranzacție Revolut — parsare eventType și rutare spre reconciliere",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:revolut:payment-record",
    "revolut:payment:record",
    "Înregistrare plată validată în goldPayments + trigger reconciliere B7",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "CRITICAL",
  ),
  n(
    "e4:revolut:refund-process",
    "revolut:refund:process",
    "Procesare rambursare Revolut — creare refund entry + notificare client",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:revolut:balance-sync",
    "revolut:balance:sync",
    "Sincronizare sold Revolut Business — cron fiecare 30 min",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "MEDIUM",
  ),
  n(
    "e4:revolut:webhook-validate",
    "revolut:webhook:validate",
    "Validare HMAC-SHA256 X-Revolut-Signature-V1 — guardrail integritate webhook",
    NeuronType.PerceptionNeuron,
    "payment-processing",
    4,
    "CRITICAL",
  ),

  // B — Payment Reconciliation Three-Tier (ReconciliationNeuron, swimlane: payment-processing)
  n(
    "e4:payment:reconcile-auto",
    "payment:reconcile:auto",
    "Reconciliere Tier 1 — exact match referință ±0.01 RON",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "CRITICAL",
  ),
  n(
    "e4:payment:reconcile-fuzzy",
    "payment:reconcile:fuzzy",
    "Reconciliere Tier 2 — pg_trgm similarity ≥0.85 + sumă ±5%",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:payment:reconcile-manual",
    "payment:reconcile:manual",
    "Reconciliere Tier 3 — HITL cu candidați scorați (no match automat)",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:payment:balance-update",
    "payment:balance:update",
    "Actualizare sold comandă post-reconciliere — UPDATE goldOrders.balanceDue",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "CRITICAL",
  ),
  n(
    "e4:payment:overdue-detect",
    "payment:overdue:detect",
    "Detecție comenzi restante — cron 0 9 * * *, graduated escalation",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "HIGH",
  ),
  n(
    "e4:payment:overdue-escalate",
    "payment:overdue:escalate",
    "Escalare restanțe graduated: 1-7d WARNING, 7-14d WA, 14+ CRITICAL HITL",
    NeuronType.ReconciliationNeuron,
    "payment-processing",
    4,
    "CRITICAL",
  ),

  // C — Credit Scoring 100p (CreditNeuron, swimlane: credit-decision)
  n(
    "e4:credit:profile-create",
    "credit:profile:create",
    "Creare profil credit + fan-out FlowProducer C14+C15+C16 paralel",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "HIGH",
  ),
  n(
    "e4:credit:data-fetch-anaf",
    "credit:data:fetch-anaf",
    "Fetch date fiscale ANAF (status TVA + datorii) → cache Redis 24h",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "HIGH",
  ),
  n(
    "e4:credit:data-fetch-bilant",
    "credit:data:fetch-bilant",
    "Fetch bilanț contabil Termene.ro — 3 ani CA, profit net, equity",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "HIGH",
  ),
  n(
    "e4:credit:data-fetch-bpi",
    "credit:data:fetch-bpi",
    "Fetch proceduri insolvență BPI via Termene.ro dosare instanță",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "HIGH",
  ),
  n(
    "e4:credit:score-calculate",
    "credit:score:calculate",
    "Calcul scor credit 100p (parent FlowJob după C14+C15+C16 complete)",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "CRITICAL",
  ),
  n(
    "e4:credit:limit-calculate",
    "credit:limit:calculate",
    "Calcul limită credit + HITL dacă >50K RON (SLA 4h CFO)",
    NeuronType.CreditNeuron,
    "credit-decision",
    4,
    "CRITICAL",
  ),

  // D — Credit Limit Management (LimitNeuron, swimlane: credit-decision)
  n(
    "e4:credit:limit-check",
    "credit:limit:check",
    "Verificare limită credit la order:created — CRITICAL path blocker",
    NeuronType.LimitNeuron,
    "credit-decision",
    4,
    "CRITICAL",
  ),
  n(
    "e4:credit:limit-reserve",
    "credit:limit:reserve",
    "Rezervare limită credit la order aprobat — blocare sumă disponibilă",
    NeuronType.LimitNeuron,
    "credit-decision",
    4,
    "CRITICAL",
  ),
  n(
    "e4:credit:limit-release",
    "credit:limit:release",
    "Eliberare rezervare limită credit la order:paid sau order:cancelled",
    NeuronType.LimitNeuron,
    "credit-decision",
    4,
    "HIGH",
  ),

  // E — Sameday AWB + Tracking (LogisticsNeuron, swimlane: logistics)
  n(
    "e4:sameday:awb-create",
    "sameday:awb:create",
    "Creare AWB Sameday la order:ready — POST /api/awb + INSERT goldShipments",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "CRITICAL",
  ),
  n(
    "e4:sameday:status-poll",
    "sameday:status:poll",
    "Poll status expedieri Sameday active — cron fiecare 30 min global",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:sameday:status-process",
    "sameday:status:process",
    "Procesare schimbare status expediere — UPDATE goldShipments + trigger chain",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:sameday:cod-process",
    "sameday:cod:process",
    "Procesare colectare COD la DELIVERED — înregistrare încasare ramburs",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:sameday:return-initiate",
    "sameday:return:initiate",
    "Inițiere returnare Sameday la 3×DELIVERY_FAILED — creare return AWB",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:sameday:pickup-schedule",
    "sameday:pickup:schedule",
    "Programare pickup Sameday batch — cron 0 14 * * * expedieri CREATED",
    NeuronType.LogisticsNeuron,
    "logistics",
    4,
    "MEDIUM",
  ),

  // F — Stock Sync Oblio (StockNeuron, swimlane: logistics)
  n(
    "e4:stock:sync-oblio",
    "stock:sync:oblio",
    "Sincronizare stoc Oblio ERP → goldProducts.metadata.stockCount — cron */15 min",
    NeuronType.StockNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:stock:deduct",
    "stock:deduct",
    "Deducere stoc la DELIVERED — scădere cantitate per produs din comandă",
    NeuronType.StockNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:stock:return",
    "stock:return",
    "Returnare stoc la RETURNED — inversare deducere cantitate per produs",
    NeuronType.StockNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:stock:low-alert",
    "stock:low:alert",
    "Alertă stoc scăzut sub prag per produs — enqueue I43 alert:stock",
    NeuronType.StockNeuron,
    "logistics",
    4,
    "MEDIUM",
  ),

  // G — DocuSign Contracts (ContractNeuron, swimlane: contract-execution)
  n(
    "e4:contract:generate",
    "contract:generate",
    "Generare contract DOCX→PDF la order:credit_approved — template + date comandă",
    NeuronType.ContractNeuron,
    "contract-execution",
    4,
    "HIGH",
  ),
  n(
    "e4:contract:clauses-select",
    "contract:clauses:select",
    "Selecție clauze contractuale per riskTier client — LOW/MEDIUM/HIGH/CRITICAL",
    NeuronType.ContractNeuron,
    "contract-execution",
    4,
    "HIGH",
  ),
  n(
    "e4:contract:docusign-send",
    "contract:docusign:send",
    "Creare envelope DocuSign + trimitere pentru semnătură electronică client",
    NeuronType.ContractNeuron,
    "contract-execution",
    4,
    "CRITICAL",
  ),
  n(
    "e4:contract:status-poll",
    "contract:status:poll",
    "Polling status envelope DocuSign SENT_DOCUSIGN — cron 0 1 * * *",
    NeuronType.ContractNeuron,
    "contract-execution",
    4,
    "HIGH",
  ),
  n(
    "e4:contract:signed-process",
    "contract:signed:process",
    "Procesare contract semnat — download PDF + arhivare S3 + UPDATE goldContracts",
    NeuronType.ContractNeuron,
    "contract-execution",
    4,
    "CRITICAL",
  ),

  // H — Returns / RMA (ReturnNeuron, swimlane: logistics)
  n(
    "e4:return:initiate",
    "return:initiate",
    "Inițiere retur — UPDATE goldOrders status RETURNED + enqueue F30 + H38",
    NeuronType.ReturnNeuron,
    "logistics",
    4,
    "HIGH",
  ),
  n(
    "e4:return:process",
    "return:process",
    "Procesare retur finalizat — stoc + audit + trigger refund chain K50",
    NeuronType.ReturnNeuron,
    "logistics",
    4,
    "HIGH",
  ),

  // I — AlertNeuron (AlertNeuron, swimlane: social-action)
  n(
    "e4:alert:payment",
    "alert:payment",
    "Alertă plată restantă — trigger din B11/B12 overdue events via canal WA/email",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "HIGH",
  ),
  n(
    "e4:alert:delivery",
    "alert:delivery",
    "Alertă livrare eșuată — trigger din E24 DELIVERY_FAILED events",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "MEDIUM",
  ),
  n(
    "e4:alert:credit",
    "alert:credit",
    "Alertă credit — trigger din C17/C18 scoring events (limită depășită/risc)",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "HIGH",
  ),
  n(
    "e4:alert:contract",
    "alert:contract",
    "Alertă contract — trigger din G35 ContractExpirySoon sau DocuSign timeout",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "MEDIUM",
  ),
  n(
    "e4:alert:stock",
    "alert:stock",
    "Alertă stoc scăzut — trigger din F31 low stock events per SKU",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "MEDIUM",
  ),
  n(
    "e4:alert:dispatch",
    "alert:dispatch",
    "Alertă dispatch — trigger din E22 AWB creation failed events",
    NeuronType.AlertNeuron,
    "social-action",
    4,
    "HIGH",
  ),

  // J — Audit Hash-Chain + GDPR (ComplianceNeuron, swimlane: audit-compliance)
  n(
    "e4:audit:log-write",
    "audit:log:write",
    "Scriere audit log cu SHA-256 hash chain — concurrency=1 serializare per tenant",
    NeuronType.ComplianceNeuron,
    "audit-compliance",
    4,
    "CRITICAL",
  ),
  n(
    "e4:audit:chain-verify",
    "audit:chain:verify",
    "Verificare integritate hash chain audit — cron 0 6 * * *, alertă la breach",
    NeuronType.ComplianceNeuron,
    "audit-compliance",
    4,
    "CRITICAL",
  ),
  n(
    "e4:audit:data-anonymize",
    "audit:data:anonymize",
    "Anonimizare GDPR date audit >7 ani — cron 0 2 * * 0, jsonb_set PII fields",
    NeuronType.ComplianceNeuron,
    "audit-compliance",
    4,
    "HIGH",
  ),

  // K — HITL Human-In-The-Loop E4 (HumanNeuron, swimlane: human-oversight-e4)
  n(
    "e4:hitl:credit-override",
    "hitl:approval:credit-override",
    "Aprobare manuală credit depășit — approver=SALES_MANAGER/CFO, SLA=4h",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "CRITICAL",
  ),
  n(
    "e4:hitl:credit-limit",
    "hitl:approval:credit-limit",
    "Aprobare limită credit >50K RON — approver=CFO, SLA=4h",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "CRITICAL",
  ),
  n(
    "e4:hitl:refund-large",
    "hitl:approval:refund-large",
    "Aprobare rambursare >1K RON — approver=FINANCE_MANAGER, SLA=4h",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "HIGH",
  ),
  n(
    "e4:hitl:payment-investigation",
    "hitl:investigation:payment",
    "Investigare plată Tier 3 no match — approver=ACCOUNTING, SLA=8h",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "HIGH",
  ),
  n(
    "e4:hitl:task-resolve",
    "hitl:task:resolve",
    "Rezolvare manuală task HITL — trigger UI action, SLA definit per task type",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "MEDIUM",
  ),
  n(
    "e4:hitl:escalation-overdue",
    "hitl:escalation:overdue",
    "Escalare SLA breach overdue → CRITICAL — notificare escalateTo chain",
    NeuronType.HumanNeuron,
    "human-oversight-e4",
    4,
    "CRITICAL",
  ),

  // ── Pipeline / Cron workers E4 (MetaNeuron + MaintenanceNeuron) ──────────
  n(
    "e4:pipeline:credit-refresh-all",
    "pipeline:credit:refresh-all",
    "Refresh bulk profile credit via Termene.ro — cron 0 3 * * *",
    NeuronType.MetaNeuron,
    "pipeline-control",
    4,
    "MEDIUM",
  ),
  n(
    "e4:pipeline:reservation-expire",
    "pipeline:reservation:expire",
    "Expirare rezervări credit stale în DB — cron */15 min, persistent (fără TTL Redis)",
    NeuronType.MaintenanceNeuron,
    "pipeline-control",
    4,
    "MEDIUM",
  ),
];

// ---------------------------------------------------------------------------
// Lookup indexes (built once at module load)
// ---------------------------------------------------------------------------

const _byKey = new Map<string, CognitiveNodeEntry>();
const _byQueue = new Map<string, CognitiveNodeEntry>();

for (const entry of COGNITIVE_NODE_CATALOG) {
  _byKey.set(entry.nodeKey, entry);
  _byQueue.set(entry.queueName, entry);
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getNodeByKey(nodeKey: string): CognitiveNodeEntry | undefined {
  return _byKey.get(nodeKey);
}

export function getNodeByQueue(queueName: string): CognitiveNodeEntry | undefined {
  return _byQueue.get(queueName);
}

export function getNodesByEtapa(etapa: number): CognitiveNodeEntry[] {
  return COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === etapa);
}

export function getNodesBySwimlane(swimlane: string): CognitiveNodeEntry[] {
  return COGNITIVE_NODE_CATALOG.filter((e) => e.swimlane === swimlane);
}

export function getNodesByNeuronType(neuronType: NeuronType): CognitiveNodeEntry[] {
  return COGNITIVE_NODE_CATALOG.filter((e) => e.neuronType === neuronType);
}

export function getPulsingNodes(): CognitiveNodeEntry[] {
  return COGNITIVE_NODE_CATALOG.filter((e) => e.pulsing);
}

// ---------------------------------------------------------------------------
// Catalog stats (useful for runtime assertions)
// ---------------------------------------------------------------------------

export const CATALOG_STATS = {
  total: COGNITIVE_NODE_CATALOG.length,
  byEtapa: {
    e1: COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === 1).length,
    e2: COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === 2).length,
    e3: COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === 3).length,
    e4: COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === 4).length,
    e5: COGNITIVE_NODE_CATALOG.filter((e) => e.etapa === 5).length,
  },
  skippedQueues: [
    {
      pattern: "q:wa:phone-{01..20}",
      count: 20,
      reason:
        "Per-phone WA queues — generate dinamic via buildWaPhoneQueues(), fără constante QUEUES.*",
    },
    {
      pattern: "q:wa:phone-{01..20}:followup",
      count: 20,
      reason:
        "Per-phone WA followup queues — generate dinamic via buildWaPhoneQueues(), fără constante QUEUES.*",
    },
    {
      pattern: "e4:pipeline:* (12 unregistered)",
      count: 12,
      reason:
        "E4 pipeline/monitoring/cron workers — plan §8h targets 67 E4 entries but only 55 queue names registered in queue-registry.ts",
    },
  ],
  skippedTotal: 52,
} as const;
