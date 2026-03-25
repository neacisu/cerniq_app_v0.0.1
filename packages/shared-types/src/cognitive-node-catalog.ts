import type { CognitiveNodeDef, NeuronType, Swimlane } from "./cognitive-types.js";

/** Keep in sync with workers/shared/src/queue-registry.ts (QUEUES + 40 q:wa:phone-** queues). */
export const WA_PHONE_COUNT = 20;

const NEURON_BIOLOGY: Record<NeuronType, string> = {
  SensoryNeuron:
    "Like primary sensory pathways transducing external signals into structured neural codes.",
  NormalizationNeuron:
    "Like thalamic relay and early cortical normalization shaping input before deeper processing.",
  ReflexNeuron:
    "Like spinal and brainstem reflex arcs that reject harmful or invalid stimuli quickly.",
  FactualNeuron:
    "Like hippocampal–neocortical circuits retrieving stable declarative facts about the world.",
  DiscoveryNeuron:
    "Like foraging and exploratory association cortex that seeks missing cues in the environment.",
  DeliberativeNeuron:
    "Like prefrontal integration supporting structured reasoning over noisy evidence (oscillatory 'pulsing').",
  SpatialNeuron: "Like hippocampal place cells and parietal maps that anchor entities in space.",
  DomainNeuron:
    "Like specialized cortical modules tuned to a domain (here, agriculture and land use).",
  PatternNeuron:
    "Like dentate gyrus pattern separation and CA3 completion separating similar memories.",
  MetaNeuron:
    "Like metacognitive monitoring that judges confidence, consistency, and self-model fit.",
  MaintenanceNeuron:
    "Like glial housekeeping and sleep-like consolidation clearing debris and stale traces.",
  HumanNeuron:
    "Like language and social cognition networks that require conscious, explicit oversight.",
  AttentionNeuron:
    "Like frontoparietal and salience networks selecting what gets processed next under load.",
  EmotionNeuron:
    "Like limbic and orbitofrontal circuits coloring social interaction with affect and rapport.",
  ProceduralNeuron:
    "Like basal ganglia–motor loops executing well-learned action sequences with low friction.",
  AutonomicNeuron:
    "Like autonomic regulation maintaining internal homeostasis without conscious effort.",
  VigilanceNeuron:
    "Like the reticular activating system sustaining arousal, limits, and threat monitoring.",
  ExecutiveNeuron:
    "Like dorsolateral prefrontal cortex coordinating goals, sequencing, and error correction.",
};

const STATIC_QUEUE_NAMES = [
  "ingest:csv",
  "ingest:excel",
  "ingest:webhook",
  "ingest:manual",
  "ingest:api",
  "normalize:name",
  "normalize:address",
  "normalize:phone",
  "normalize:email",
  "enrich:bronze:anaf",
  "validate:cui:mod11",
  "validate:cui:anaf",
  "enrich:anaf:fiscal-status",
  "enrich:anaf:tva-status",
  "enrich:anaf:efactura",
  "enrich:anaf:datorii",
  "enrich:anaf:caen",
  "enrich:anaf:full",
  "enrich:termene:balance",
  "enrich:termene:risk",
  "enrich:termene:dosare",
  "enrich:termene:actionari",
  "enrich:onrc:data",
  "enrich:onrc:administratori",
  "enrich:onrc:sedii",
  "discover:email:hunter",
  "discover:email:hunter-verify",
  "discover:email:zerobounce",
  "enrich:email:enricher",
  "discover:email:pattern",
  "discover:email:generate",
  "enrich:phone:normalize",
  "enrich:phone:hlr",
  "enrich:phone:carrier",
  "scrape:legal:daj",
  "scrape:legal:anif",
  "scrape:website:finder",
  "scrape:website:contact-page",
  "ai:structure:xai",
  "ai:merge:xai",
  "ai:score:confidence",
  "ai:fallback",
  "geo:geocode:nominatim",
  "geo:zones:postgis",
  "geo:proximity",
  "agri:apia",
  "agri:ouai",
  "agri:cooperative",
  "agri:culturi",
  "agri:animale",
  "dedup:exact",
  "dedup:fuzzy",
  "score:completeness",
  "score:accuracy",
  "score:freshness",
  "aggregate:daily-stats",
  "aggregate:quality-rollup",
  "pipeline:orchestrate",
  "pipeline:promote:gold",
  "pipeline:promote:bronze-silver",
  "pipeline:monitor",
  "pipeline:error-handler",
  "hitl:escalate",
  "hitl:resume",
  "maintenance:import-file-cleanup",
  "quota:guardian:check",
  "quota:guardian:increment",
  "quota:guardian:reset",
  "quota:business-hours:check",
  "outreach:orchestrator:dispatch",
  "outreach:orchestrator:router",
  "outreach:phone:allocator",
  "outreach:channel:selector",
  "q:wa:reply",
  "wa:message:retry",
  "wa:chat:history:fetch",
  "wa:status:sync",
  "wa:media:send",
  "q:email:cold",
  "email:cold:campaign:create",
  "email:cold:campaign:pause",
  "email:cold:analytics:fetch",
  "email:cold:lead:status",
  "q:email:warm",
  "email:warm:proforma",
  "email:warm:document",
  "template:spintax:process",
  "template:personalize",
  "template:validate",
  "webhook:timelinesai:ingest",
  "webhook:instantly:ingest",
  "webhook:resend:ingest",
  "webhook:normalize",
  "sequence:schedule:followup",
  "sequence:stop",
  "sequence:advance",
  "sequence:create",
  "lead:state:transition",
  "lead:state:validate",
  "lead:assign:user",
  "ai:sentiment:analyze",
  "ai:response:generate",
  "ai:intent:classify",
  "monitor:phone:health",
  "monitor:email:deliverability",
  "monitor:quota:usage",
  "alert:phone:offline",
  "alert:phone:banned",
  "alert:bounce:high",
  "human:review:queue",
  "human:review:assign",
  "human:takeover:initiate",
  "human:takeover:complete",
  "human:approve:message",
  "human:review:escalation",
  "human:review:audit-log",
  "pipeline:outreach:health",
  "pipeline:outreach:metrics",
  "dlq:outreach",
] as const;

const QUEUE_COGNITIVE_FUNCTION: Record<(typeof STATIC_QUEUE_NAMES)[number], string> = {
  "ingest:csv": "Ingests company and lead rows from CSV uploads into the bronze data path.",
  "ingest:excel": "Ingests spreadsheet uploads (Excel) and normalizes them into pipeline jobs.",
  "ingest:webhook": "Accepts push payloads from external systems via webhook endpoints.",
  "ingest:manual": "Handles operator-initiated manual imports and one-off file submissions.",
  "ingest:api": "Pulls or receives structured records through the public import API.",
  "normalize:name": "Canonicalizes person and company names for matching and display.",
  "normalize:address": "Parses and standardizes postal addresses for geocoding and validation.",
  "normalize:phone": "Normalizes phone numbers to E.164 and consistent national formats.",
  "normalize:email": "Normalizes email addresses (trim, lowercase, basic validity).",
  "enrich:bronze:anaf": "Fetches and attaches initial ANAF fiscal identifiers to bronze entities.",
  "validate:cui:mod11": "Validates Romanian CUI check digits using MOD11 before external calls.",
  "validate:cui:anaf": "Cross-checks CUI existence and status against ANAF online services.",
  "enrich:anaf:fiscal-status": "Loads fiscal registration and active/inactive status from ANAF.",
  "enrich:anaf:tva-status": "Resolves VAT (TVA) payer state and related fiscal markers.",
  "enrich:anaf:efactura": "Pulls e-Factura participation and electronic invoice signals.",
  "enrich:anaf:datorii": "Retrieves tax and social debt summaries where published.",
  "enrich:anaf:caen": "Resolves NACE/CAEN activity codes from ANAF registries.",
  "enrich:anaf:full": "Orchestrates a bundled ANAF enrichment pass for high-throughput batches.",
  "enrich:termene:balance": "Fetches balance-sheet style financial signals from Termene.",
  "enrich:termene:risk": "Computes or loads risk scores and red-flag indicators from Termene.",
  "enrich:termene:dosare": "Associates court case dossier metadata from Termene.",
  "enrich:termene:actionari": "Resolves shareholder and ownership graph hints from Termene.",
  "enrich:onrc:data": "Loads core ONRC company registration fields.",
  "enrich:onrc:administratori": "Lists administrators and legal representatives from ONRC.",
  "enrich:onrc:sedii": "Resolves registered offices and location entries from ONRC.",
  "discover:email:hunter": "Discovers likely corporate emails using Hunter.io style lookup.",
  "discover:email:hunter-verify": "Verifies Hunter-sourced emails for deliverability signals.",
  "discover:email:zerobounce": "Validates emails via ZeroBounce (bounce/quality scoring).",
  "enrich:email:enricher": "Runs the internal email enrichment pass on known or guessed addresses.",
  "discover:email:pattern": "Generates candidate emails from common local-part patterns.",
  "discover:email:generate": "Synthesizes additional email candidates for outreach testing.",
  "enrich:phone:normalize": "Normalizes and formats phone numbers before HLR or carrier steps.",
  "enrich:phone:hlr": "Queries HLR/home-network data for line type and routing metadata.",
  "enrich:phone:carrier": "Resolves mobile carrier and numbering metadata for outreach routing.",
  "scrape:legal:daj": "Scrapes DAJ-related legal/agricultural publication pages when configured.",
  "scrape:legal:anif": "Scrapes ANIF-related regulatory listings for agri context.",
  "scrape:website:finder": "Discovers official or candidate company websites from weak signals.",
  "scrape:website:contact-page": "Extracts contact and form URLs from corporate sites.",
  "ai:structure:xai": "Uses xAI to structure messy text into typed fields and JSON fragments.",
  "ai:merge:xai": "Merges conflicting AI or human-originated fragments with xAI assistance.",
  "ai:score:confidence": "Scores model and field-level confidence for downstream gating.",
  "ai:fallback": "Applies cheaper or rule-based fallbacks when primary AI paths fail.",
  "geo:geocode:nominatim": "Geocodes addresses to coordinates using Nominatim/OSM data.",
  "geo:zones:postgis": "Assigns polygons, counties, and custom zones via PostGIS.",
  "geo:proximity": "Computes distance and proximity relationships between entities and assets.",
  "agri:apia": "Enriches APIA subsidy and farm-program participation where available.",
  "agri:ouai": "Resolves OUAI / local agricultural office associations.",
  "agri:cooperative": "Links agricultural cooperative memberships and identifiers.",
  "agri:culturi": "Attaches crop and cultivation declarations when sources permit.",
  "agri:animale": "Attaches livestock registry hints and herd-related metadata.",
  "dedup:exact": "Collapses exact-key duplicates across bronze and silver entities.",
  "dedup:fuzzy": "Clusters near-duplicate companies using fuzzy similarity rules.",
  "score:completeness": "Scores record completeness for pipeline promotion gates.",
  "score:accuracy": "Scores cross-field and source agreement as an accuracy proxy.",
  "score:freshness": "Scores staleness of facts relative to SLAs and last-seen timestamps.",
  "aggregate:daily-stats": "Rolls up per-day operational and volume statistics.",
  "aggregate:quality-rollup": "Aggregates quality metrics for dashboards and alerting.",
  "pipeline:orchestrate": "Central orchestration of Etapa 1 stages, promotions, and retries.",
  "pipeline:promote:gold": "Promotes vetted silver records into gold-tier curated datasets.",
  "pipeline:promote:bronze-silver":
    "Runs bronze-to-silver promotion with enrichment prerequisites.",
  "pipeline:monitor": "Watches queue depths, stalled jobs, and stage SLAs for Etapa 1.",
  "pipeline:error-handler":
    "Routes failures, compensating actions, and dead-letter style recovery.",
  "hitl:escalate": "Escalates ambiguous or high-risk records into human review (HITL).",
  "hitl:resume": "Resumes automated processing after human approval or rejection.",
  "maintenance:import-file-cleanup":
    "Deletes or archives stale import blobs and temp upload files.",
  "quota:guardian:check": "Checks per-tenant and per-channel quotas before sends.",
  "quota:guardian:increment": "Increments send counters after successful delivery attempts.",
  "quota:guardian:reset": "Resets or rolls quota windows on schedule or admin action.",
  "quota:business-hours:check": "Enforces business-hours and quiet-hour policies for outreach.",
  "outreach:orchestrator:dispatch": "Dispatches outreach jobs to the correct downstream workers.",
  "outreach:orchestrator:router": "Routes replies and events back into sequences and lead state.",
  "outreach:phone:allocator": "Allocates outbound WhatsApp lines and capacity across campaigns.",
  "outreach:channel:selector": "Chooses email vs WhatsApp vs other channels per lead context.",
  "q:wa:reply": "Processes inbound WhatsApp replies and delivery receipts (non per-phone).",
  "wa:message:retry": "Retries failed WhatsApp sends with backoff and health checks.",
  "wa:chat:history:fetch": "Synchronizes chat history and read-state from the provider.",
  "wa:status:sync": "Syncs online/offline and session health for WhatsApp numbers.",
  "wa:media:send": "Handles outbound media attachments on WhatsApp.",
  "q:email:cold": "Sends cold email sequences via the configured cold-email provider.",
  "email:cold:campaign:create": "Creates Instantly-style cold campaigns and mailboxes linkage.",
  "email:cold:campaign:pause": "Pauses or freezes campaigns on policy or deliverability signals.",
  "email:cold:analytics:fetch": "Pulls opens, clicks, and reply analytics for cold mail.",
  "email:cold:lead:status": "Updates lead engagement state from cold-email events.",
  "q:email:warm": "Sends warm relationship emails (proforma, documents, follow-ups).",
  "email:warm:proforma": "Generates and tracks proforma invoice emails in warm flows.",
  "email:warm:document": "Delivers contract or document emails in warm nurture paths.",
  "template:spintax:process": "Expands spintax variants for deliverability and A/B diversity.",
  "template:personalize": "Merges lead fields into message templates before send.",
  "template:validate": "Validates template syntax, links, and compliance placeholders.",
  "webhook:timelinesai:ingest": "Ingests TimelinesAI WhatsApp webhook callbacks.",
  "webhook:instantly:ingest": "Ingests Instantly email lifecycle webhooks.",
  "webhook:resend:ingest": "Ingests Resend transactional and event webhooks.",
  "webhook:normalize": "Normalizes heterogeneous webhook payloads to internal event shapes.",
  "sequence:schedule:followup": "Schedules the next step in multi-touch outreach sequences.",
  "sequence:stop": "Stops sequences on unsubscribe, reply, or manual halt.",
  "sequence:advance": "Advances sequence state machines when steps complete.",
  "sequence:create": "Creates new sequences from templates and campaign definitions.",
  "lead:state:transition": "Applies valid lead state transitions (e.g. new → contacted).",
  "lead:state:validate": "Validates transition preconditions and guard rules.",
  "lead:assign:user": "Assigns leads to owners or pools for human follow-up.",
  "ai:sentiment:analyze": "Classifies message sentiment for routing and tone adaptation.",
  "ai:response:generate": "Drafts AI-assisted replies pending policy or human approval.",
  "ai:intent:classify": "Detects user intent (opt-out, question, booking) from free text.",
  "monitor:phone:health": "Monitors WhatsApp number health, bans, and connectivity.",
  "monitor:email:deliverability": "Tracks bounce rates, spam placement, and domain reputation.",
  "monitor:quota:usage": "Observes quota consumption versus limits across tenants.",
  "alert:phone:offline": "Raises alerts when a WhatsApp line goes offline unexpectedly.",
  "alert:phone:banned": "Raises alerts on provider-side bans or policy blocks.",
  "alert:bounce:high": "Raises alerts when email bounce rate crosses thresholds.",
  "human:review:queue": "Queues items for human review before automated sends continue.",
  "human:review:assign": "Assigns review tickets to operators or teams.",
  "human:takeover:initiate": "Hands the conversation from automation to a human agent.",
  "human:takeover:complete": "Returns control to automation after human wrap-up.",
  "human:approve:message": "Requires explicit approval for sensitive outbound messages.",
  "human:review:escalation": "Escalates stuck reviews to supervisors or alternate queues.",
  "human:review:audit-log": "Writes immutable audit entries for compliance on human actions.",
  "pipeline:outreach:health": "Aggregates outreach subsystem health for Etapa 2 control plane.",
  "pipeline:outreach:metrics": "Emits outreach funnel metrics for observability stacks.",
  "dlq:outreach": "Holds failed outreach jobs for inspection, replay, or discard.",
};

function queueToNodeKey(queueName: string): string {
  return `worker:${queueName.replace(/:/g, "-")}`;
}

function displayNameFromQueue(queueName: string): string {
  return queueName
    .split(":")
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("-"),
    )
    .join(" · ");
}

function classifyStaticQueue(queueName: (typeof STATIC_QUEUE_NAMES)[number]): {
  neuronType: NeuronType;
  swimlane: Swimlane;
  etapa: 1 | 2;
  criticality: CognitiveNodeDef["criticality"];
  pulsing?: true;
} {
  switch (queueName) {
    case "ingest:csv":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        etapa: 1,
        criticality: "HIGH",
      };
    case "ingest:excel":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        etapa: 1,
        criticality: "HIGH",
      };
    case "ingest:webhook":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        etapa: 1,
        criticality: "HIGH",
      };
    case "ingest:manual":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        etapa: 1,
        criticality: "HIGH",
      };
    case "ingest:api":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "data-ingest",
        etapa: 1,
        criticality: "HIGH",
      };
    case "normalize:name":
      return {
        neuronType: "NormalizationNeuron",
        swimlane: "normalization",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "normalize:address":
      return {
        neuronType: "NormalizationNeuron",
        swimlane: "normalization",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "normalize:phone":
      return {
        neuronType: "NormalizationNeuron",
        swimlane: "normalization",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "normalize:email":
      return {
        neuronType: "NormalizationNeuron",
        swimlane: "normalization",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:bronze:anaf":
      return {
        neuronType: "NormalizationNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "validate:cui:mod11":
      return { neuronType: "ReflexNeuron", swimlane: "validation", etapa: 1, criticality: "HIGH" };
    case "validate:cui:anaf":
      return { neuronType: "ReflexNeuron", swimlane: "validation", etapa: 1, criticality: "HIGH" };
    case "enrich:anaf:fiscal-status":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:anaf:tva-status":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:anaf:efactura":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:anaf:datorii":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:anaf:caen":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:anaf:full":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:termene:balance":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:termene:risk":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:termene:dosare":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:termene:actionari":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:onrc:data":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:onrc:administratori":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:onrc:sedii":
      return {
        neuronType: "FactualNeuron",
        swimlane: "enrichment-fiscal",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "discover:email:hunter":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "discover:email:hunter-verify":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "discover:email:zerobounce":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:email:enricher":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "discover:email:pattern":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "discover:email:generate":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:phone:normalize":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:phone:hlr":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "enrich:phone:carrier":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "scrape:legal:daj":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "scrape:legal:anif":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "scrape:website:finder":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "scrape:website:contact-page":
      return {
        neuronType: "DiscoveryNeuron",
        swimlane: "enrichment-external",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "ai:structure:xai":
      return {
        neuronType: "DeliberativeNeuron",
        swimlane: "ai-analysis",
        etapa: 1,
        criticality: "HIGH",
        pulsing: true,
      };
    case "ai:merge:xai":
      return {
        neuronType: "DeliberativeNeuron",
        swimlane: "ai-analysis",
        etapa: 1,
        criticality: "HIGH",
        pulsing: true,
      };
    case "ai:score:confidence":
      return {
        neuronType: "DeliberativeNeuron",
        swimlane: "ai-analysis",
        etapa: 1,
        criticality: "HIGH",
        pulsing: true,
      };
    case "ai:fallback":
      return {
        neuronType: "DeliberativeNeuron",
        swimlane: "ai-analysis",
        etapa: 1,
        criticality: "HIGH",
        pulsing: true,
      };
    case "geo:geocode:nominatim":
      return {
        neuronType: "SpatialNeuron",
        swimlane: "geospatial",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "geo:zones:postgis":
      return {
        neuronType: "SpatialNeuron",
        swimlane: "geospatial",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "geo:proximity":
      return {
        neuronType: "SpatialNeuron",
        swimlane: "geospatial",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "agri:apia":
      return {
        neuronType: "DomainNeuron",
        swimlane: "domain-agriculture",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "agri:ouai":
      return {
        neuronType: "DomainNeuron",
        swimlane: "domain-agriculture",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "agri:cooperative":
      return {
        neuronType: "DomainNeuron",
        swimlane: "domain-agriculture",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "agri:culturi":
      return {
        neuronType: "DomainNeuron",
        swimlane: "domain-agriculture",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "agri:animale":
      return {
        neuronType: "DomainNeuron",
        swimlane: "domain-agriculture",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "dedup:exact":
      return {
        neuronType: "PatternNeuron",
        swimlane: "dedup-scoring",
        etapa: 1,
        criticality: "HIGH",
      };
    case "dedup:fuzzy":
      return {
        neuronType: "PatternNeuron",
        swimlane: "dedup-scoring",
        etapa: 1,
        criticality: "HIGH",
      };
    case "score:completeness":
      return {
        neuronType: "MetaNeuron",
        swimlane: "dedup-scoring",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "score:accuracy":
      return {
        neuronType: "MetaNeuron",
        swimlane: "dedup-scoring",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "score:freshness":
      return {
        neuronType: "MetaNeuron",
        swimlane: "dedup-scoring",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "aggregate:daily-stats":
      return {
        neuronType: "MaintenanceNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "aggregate:quality-rollup":
      return {
        neuronType: "MaintenanceNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "MEDIUM",
      };
    case "pipeline:orchestrate":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "CRITICAL",
      };
    case "pipeline:promote:gold":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "HIGH",
      };
    case "pipeline:promote:bronze-silver":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "HIGH",
      };
    case "pipeline:monitor":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "HIGH",
      };
    case "pipeline:error-handler":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "CRITICAL",
      };
    case "hitl:escalate":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 1,
        criticality: "CRITICAL",
      };
    case "hitl:resume":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 1,
        criticality: "CRITICAL",
      };
    case "maintenance:import-file-cleanup":
      return {
        neuronType: "MaintenanceNeuron",
        swimlane: "pipeline-control",
        etapa: 1,
        criticality: "LOW",
      };
    case "quota:guardian:check":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "quota:guardian:increment":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "quota:guardian:reset":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "quota:business-hours:check":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "outreach:orchestrator:dispatch":
      return {
        neuronType: "AttentionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "outreach:orchestrator:router":
      return {
        neuronType: "AttentionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "outreach:phone:allocator":
      return {
        neuronType: "AttentionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "outreach:channel:selector":
      return {
        neuronType: "AttentionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "q:wa:reply":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "wa:message:retry":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "wa:chat:history:fetch":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "wa:status:sync":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "wa:media:send":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "q:email:cold":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:cold:campaign:create":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:cold:campaign:pause":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:cold:analytics:fetch":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:cold:lead:status":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "q:email:warm":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:warm:proforma":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "email:warm:document":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "template:spintax:process":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "template:personalize":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "template:validate":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "webhook:timelinesai:ingest":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "webhook:instantly:ingest":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "webhook:resend:ingest":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "webhook:normalize":
      return {
        neuronType: "SensoryNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "sequence:schedule:followup":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "sequence:stop":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "sequence:advance":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "sequence:create":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "lead:state:transition":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "lead:state:validate":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "lead:assign:user":
      return {
        neuronType: "ProceduralNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "ai:sentiment:analyze":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "ai:response:generate":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "ai:intent:classify":
      return {
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "monitor:phone:health":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "monitor:email:deliverability":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "monitor:quota:usage":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "MEDIUM",
      };
    case "alert:phone:offline":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "alert:phone:banned":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "alert:bounce:high":
      return {
        neuronType: "VigilanceNeuron",
        swimlane: "social-action",
        etapa: 2,
        criticality: "HIGH",
      };
    case "human:review:queue":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:review:assign":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:takeover:initiate":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:takeover:complete":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:approve:message":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:review:escalation":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "human:review:audit-log":
      return {
        neuronType: "HumanNeuron",
        swimlane: "human-oversight",
        etapa: 2,
        criticality: "CRITICAL",
      };
    case "pipeline:outreach:health":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 2,
        criticality: "HIGH",
      };
    case "pipeline:outreach:metrics":
      return {
        neuronType: "ExecutiveNeuron",
        swimlane: "pipeline-control",
        etapa: 2,
        criticality: "HIGH",
      };
    case "dlq:outreach":
      return {
        neuronType: "MaintenanceNeuron",
        swimlane: "pipeline-control",
        etapa: 2,
        criticality: "MEDIUM",
      };
    default:
      throw new Error(`Unmapped queue: ${queueName satisfies never}`);
  }
}

function buildStaticNodes(): CognitiveNodeDef[] {
  return STATIC_QUEUE_NAMES.map((queueName) => {
    const cls = classifyStaticQueue(queueName);
    return {
      nodeKey: queueToNodeKey(queueName),
      displayName: displayNameFromQueue(queueName),
      queueName,
      neuronType: cls.neuronType,
      swimlane: cls.swimlane,
      etapa: cls.etapa,
      cognitiveFunction: QUEUE_COGNITIVE_FUNCTION[queueName],
      biologicalAnalogy: NEURON_BIOLOGY[cls.neuronType],
      criticality: cls.criticality,
      ...(cls.pulsing ? { pulsing: true as const } : {}),
    };
  });
}

function buildWaPhoneNodes(): CognitiveNodeDef[] {
  const nodes: CognitiveNodeDef[] = [];
  for (let i = 1; i <= WA_PHONE_COUNT; i++) {
    const idx = String(i).padStart(2, "0");
    const primary = `q:wa:phone-${idx}`;
    const followup = `q:wa:phone-${idx}:followup`;
    nodes.push(
      {
        nodeKey: queueToNodeKey(primary),
        displayName: `WhatsApp line ${i} (outbound)`,
        queueName: primary,
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        cognitiveFunction:
          "Dedicated per-phone WhatsApp send queue with strict concurrency to prevent head-of-line blocking.",
        biologicalAnalogy: NEURON_BIOLOGY.EmotionNeuron,
        criticality: "HIGH",
      },
      {
        nodeKey: queueToNodeKey(followup),
        displayName: `WhatsApp line ${i} (follow-up)`,
        queueName: followup,
        neuronType: "EmotionNeuron",
        swimlane: "social-action",
        etapa: 2,
        cognitiveFunction:
          "Follow-up messages for the same dedicated line, isolated from primary sends for ordering guarantees.",
        biologicalAnalogy: NEURON_BIOLOGY.EmotionNeuron,
        criticality: "MEDIUM",
      },
    );
  }
  return nodes;
}

function buildCatalog(): CognitiveNodeDef[] {
  return [...buildStaticNodes(), ...buildWaPhoneNodes()];
}

export const COGNITIVE_NODE_CATALOG: readonly CognitiveNodeDef[] = Object.freeze(buildCatalog());

const queueNameToNode = new Map<string, CognitiveNodeDef>();
for (const node of COGNITIVE_NODE_CATALOG) {
  queueNameToNode.set(node.queueName, node);
}

export function getNodeByQueueName(queueName: string): CognitiveNodeDef | undefined {
  return queueNameToNode.get(queueName);
}

export function getNodesByEtapa(etapa: number): CognitiveNodeDef[] {
  return COGNITIVE_NODE_CATALOG.filter((node) => node.etapa === etapa);
}

export function getNodesBySwimlane(swimlane: Swimlane): CognitiveNodeDef[] {
  return COGNITIVE_NODE_CATALOG.filter((node) => node.swimlane === swimlane);
}
