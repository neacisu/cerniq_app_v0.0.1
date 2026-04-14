<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:contact-parse`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:ai:contact-parse` |
| etapa | E1 |
| familie (v2, prima instanță) | `ai-enrichment` |
| contract_path | `contracts/neurons/E1/enrich--ai--contact-parse.md` |
| ADR familie (indicativ) | [ai-enrichment](../../adr/families/e1/ai-enrichment.md) |

## Scop în context real

În **v2** (§6), neuronul este descris ca AI de structurare/clasificare a datelor neuniforme, cu coadă canonică `enrich:ai:contact-parse` și focus pe lanț OODA + prag de încredere. În **repo**, nu există o coadă BullMQ cu acest șir literal: `workers/shared/src/queue-registry.ts` și `packages/shared/src/cognitive-node-catalog.ts` nu îl înregistrează. **ADR-FAMILY-e1-ai-enrichment** documentează explicit decalajul dintre prefixul din graf (`enrich:ai:*`) și cozile runtime (`ai:*`). Capabilitatea cea mai apropiată, **cu dovadă în cod**, este structurarea JSON a datelor companiei (inclusiv câmpuri de contact `email`, `telefon`, `website`) prin coada `ai:structure:xai`, procesată de `grokStructuringProcessor` în `workers/enrichment/src/workers/j1-grok-structuring.ts`, enfileată din `workers/enrichment/src/workers/p1-orchestrate.ts`. Nu se poate afirma identitate 1:1 între eticheta de graf `contact-parse` și acest worker fără mapare formală în ADR — aici doar raportăm suprapunerea funcțională observată.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:ai:contact-parse\`` (L1741–1761).
- `docs/CognitiveBrain/adr/families/e1/ai-enrichment.md` — reconciliere graf vs runtime (în special prefixe și inventar 3 vs 4 cozi AI).
- `workers/shared/src/queue-registry.ts` — absență literal `enrich:ai:contact-parse`; prezență `AI_STRUCTURE_XAI` → `ai:structure:xai`.
- `packages/shared/src/cognitive-node-catalog.ts` — secțiunea „J — AI E1”, intrarea `e1:ai:structure-xai` / `ai:structure:xai` (în jurul L714–723); absență intrare pentru `enrich:ai:contact-parse`.
- `workers/enrichment/src/main.ts` — mapare procesor `ai:structure:xai` → `grokStructuringProcessor` (L149).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — `addQueueJob("ai:structure:xai", …)` (L144–145).
- `workers/enrichment/src/workers/j1-grok-structuring.ts` — payload job, prompt, prag încredere, HITL, `withCognitiveSpan` (L17–199).
- `workers/enrichment/src/lib/infraq-structured-json.ts` — apel LLM structurat + fallback (L25–77).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`, nume span `cognitive:${nodeKey}`, atribute (L215–234).
- `workers/shared/src/llm-client.ts` — `INFRAQ_REASONING_MODEL` (L15).
- `workers/enrichment/src/workers/j1-grok-structuring.integration.test.ts` — test integrare J1 cu mock `infraqStructuredJson`.

## Instanțe v2

### Instanță 1 — `ai-enrichment` (v2 ~L1741)

- **Stage:** E1
- **Family:** ai-enrichment
- **Inferred neuron type:** DeliberativeNeuron
- **Inferred criticality:** HIGH
- **Autonomy tier:** Tier 3 (act with oversight)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coada nu e reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: load context. ORIENT: LLM reasoning (SGLang structured output). DECIDE: confidence gate (>0.80 pass). ACT: emit decision + episodic memory update.
- **Model routing (v2):** PRIMARY: vllm-reasoning-32b (QwQ-32B-AWQ). FALLBACK: frontier if confidence < 0.80. SGLang guided_json.
- **Guardrail/HITL policy (v2):** HITL on anomaly (confidence < 0.80). SLA: 4h.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="DeliberativeNeuron",stage="E1",swimlane="ai-enrichment"}`
- **OTel span name (v2):** `cognitive.enrich.ai.contact-parse`

## N/A pe criterii

Nu s-a folosit **N/A** pe rânduri: fiecare criteriu are fie dovadă în cod (pentru coada `ai:structure:xai` / J1), fie formulare explicită de gap față de v2 sau față de eticheta `enrich:ai:contact-parse`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap:** `enrich:ai:contact-parse` lipsește din `queue-registry.ts` și din `cognitive-node-catalog.ts` (căutare literală la audit). **Cea mai apropiată** intrare catalog: `nodeKey` `e1:ai:structure-xai`, coadă `ai:structure:xai`. **Divergență:** `grokStructuringProcessor` apelează `withCognitiveSpan("e1:ai:structure-infraq", …)` (`j1-grok-structuring.ts` L123–124) — cheie **nu** există în catalog (doar `e1:ai:structure-xai`), deci `getNodeByKey` nu atașează metadata catalog pe span. | v2: `enrich:ai:contact-parse`; v2 cere reconciliere registry. | v2 §2.4 — maparea graf→runtime e neînchisă în cod pentru acest șir. |
| 2 | Etapă, familie, swimlane | Etapă **E1** în `main.ts` / `registerCognitiveWorkerEtapa(1)`. Coada runtime `ai:structure:xai` are în catalog `swimlane` **`ai-analysis`** (`cognitive-node-catalog.ts`). Familia v2 **`ai-enrichment`** este etichetă de graf, nu swimlane în catalog. | v2: E1, familie `ai-enrichment`; metrici v2 cu `swimlane="ai-enrichment"`. | Etichetele familie graf vs swimlane catalog coexistă (vezi ADR familie). |
| 3 | Rol declarat | Pentru **implementarea** `ai:structure:xai`: catalog — „Structurare date nestructurate cu AI xAI”. În **J1**, schema JSON cerută include explicit `email`, `telefon`, `website` (`j1-grok-structuring.ts` L151), aliniat semantic cu „contact” din numele v2, fără a echivala formal cele două denumiri. | v2: funcție cognitivă AI structurare/clasificare; analogie corticală prefrontală. | Rolul v2 pe `enrich:ai:contact-parse` nu are intrare catalog separată. |
| 4 | NeuronType + SOFAI | Catalog: `NeuronType.DeliberativeNeuron` pentru `e1:ai:structure-xai`. Clasificare **System 2** (deliberativ) conform v2 §2.1 pentru acest profil. | v2: `DeliberativeNeuron`. | Tipul din catalog se referă la `e1:ai:structure-xai`, nu la `enrich:ai:contact-parse`. |
| 5 | Criticitate | Catalog: **HIGH** pentru `e1:ai:structure-xai`. | v2: **HIGH**. | Aceeași limită ca la rândul 1 (cheie span vs catalog). |
| 6 | Înveliș telemetrie | Span OTel: `withCognitiveSpan` creează nume `cognitive:${nodeKey}` → în J1 `cognitive:e1:ai:structure-infraq` (`cognitive-helpers.ts` L226). **Nu** apare `cognitive.enrich.ai.contact-parse` din v2. Atribute: `cognitive.nodeKey` setat mereu; `cognitive.neuronType`, `cognitive.swimlane`, `cognitive.etapa`, `cognitive.function` doar dacă `getNodeByKey(nodeKey)` găsește intrare — **lipsă** pentru `e1:ai:structure-infraq`. GenAI: nu am citit în această cale setarea semconv `gen_ai.*` în J1 (nu apare în fragmentele citate). | v2: span `cognitive.enrich.ai.contact-parse`; mapare `cognitive.neuron.*` vs `cognitive.nodeKey` — ADR-0003. | Migrare nume span + aliniere `nodeKey` la catalog pentru atribute. |
| 7 | Înveliș politică | **Fără** Cedar/OPA în J1 la audit. Prag comportament: `canAutoApply = confidence >= 0.7` și validare CUI (`j1-grok-structuring.ts` L158–159). Sub prag → `createHitlApprovalTask` (același fișier, L32–45), `expiresInHours: 48` — **nu** „SLA 4h” din v2. | v2: Tier 3, HITL la încredere < 0.80, SLA 4h; Cedar/OPA — destinație documentată. | Praguri și SLA diferă numeric între v2 și implementare; politici OPA neobservate în J1. |
| 8 | Rutare model (dacă AI) | `infraqStructuredJson`: primar `reasoningClient` cu `INFRAQ_REASONING_MODEL` = `Qwen/QwQ-32B-AWQ` (`infraq-structured-json.ts` L36–54, `llm-client.ts` L15); la eșec, `withLlmFallbackChain` + pași frontier (`infraq-structured-json.ts` L36–76). **Nu** este același mecanism textual ca „SGLang guided_json” din v2, dar modelul primar se potrivește denumirii QwQ din v2. | v2: self-hosted-first + fallback la încredere < 0.80; SGLang. | Fallback din v2 e formulat pe încredere; în cod există lanț la erori infraq, nu același trigger. |
| 9 | Guardrails | **Nu** s-au găsit integrări NeMo/Colang în `j1-grok-structuring.ts`. Validare deterministă: `sanitizeCui`, `validateCuiModulo11` înainte de aplicare (`j1-grok-structuring.ts` L155–156). | v2 + ADR-0007: NeMo + verificări deterministe. | NeMo: destinație arhitecturală, neimplementată în fișierul citat. |
| 10 | Escaladare HITL | `createHitlApprovalTask` cu `type: "ai_structuring_review"` când nu se poate aplica automat (`j1-grok-structuring.ts` L32–45). | v2: escaladare la anomalii de încredere; ADR-0008 motor transversal. | Detaliile cozilor `human:*`/`hitl:*` pentru acest flux nu sunt în J1; task creat prin `pipeline-utils`. |
| 11 | Micro-OODA | **Observe:** încărcare `rawData` din job + context tenant (`j1-grok-structuring.ts` L139–152). **Orient:** apel `infraqStructuredJson` (LLM). **Decide:** prag `canAutoApply` / rutare HITL. **Act:** update `silverCompanies` + log sau task HITL (L54–119, L160–178). **Neo4j GraphRAG** în pasul Orient: **lipsă** în codul citit — rămâne destinație v2/ADR-0005. | v2 OODA + Orient SGLang; GraphRAG — destinație v2. | Instrumentarea v2 (SGLang explicit) nu coincide cu stack-ul citit (infraq + frontier). |
| 12 | Tier + de-escaladare | **De facto:** sub `confidence >= 0.7` sau CUI invalid → nu auto-aplicare; HITL. **Nu** există în J1 trigger explicit „2σ” sau „schemă API neașteptată” din checklist plan. | v2 §2.2: tier 3 + trigger-e standard. | Invariantele v2 pentru de-escaladare nu sunt toate vizibile în J1. |
| 13 | Stack v2 §2.3 (subset) | **Cu dovadă în ramura citită:** BullMQ (`Job`, procesor în worker enrichment), apel HTTP către infraq reasoning, lanț fallback frontier în `worker-shared`, OpenTelemetry prin `withCognitiveSpan`. **Nu** am auditat Kafka/SGLang/Neo4j pentru acest neuron. | v2 §2.3 + ADR-uri globale. | Stack complet v2: parțial neaudit pentru acest flux. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.contact-parse` și convenții `cognitive.neuron.*` pot apărea în plan.
- **Cod:** span `cognitive:e1:ai:structure-infraq`; atribute catalog **nepopulate** din cauza `nodeKey` inexistent în catalog; lista de atribute dorite în `cognitive-helpers.ts` L228–233.
- **Stare la 2026-04-11:** **migrare necesară** — aliniere `nodeKey` în J1 la `e1:ai:structure-xai` (sau completare catalog pentru `e1:ai:structure-infraq`) + eventual redenumire span către convenția v2.
