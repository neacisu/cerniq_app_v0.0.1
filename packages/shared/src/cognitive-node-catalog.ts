/**
 * Cognitive Node Catalog — COMPLETE mapping of all BullMQ queues
 * to the CerniqAPP cognitive brain canvas.
 *
 * Source of truth for queue names: @cerniq/worker-shared queue-registry.ts
 * Static queues cataloged: 118 (64 E1 + 54 E2)
 * Skipped: 40 per-phone WA queues (dynamically generated, no QUEUES.* constants)
 * E3–E5: 0 entries (no queues exist in queue-registry yet)
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
  | "fiscal-execution";

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
  ],
  skippedTotal: 40,
} as const;
