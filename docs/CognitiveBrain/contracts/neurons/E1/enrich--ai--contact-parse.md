<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:contact-parse`

> **Perimetru:** contract **doar** pentru acest neuron din plan (~L1741 în `v2_cerniq_cognitive_brain_master_implementation_plan.md`). Tripletul din plan are **trei** contracte separate (contact-parse, industry-classify, text-structure); **nu** documentăm aici alți neuroni din matrice.  
> **Status:** audit manual **2026-04-11**, remedieri runtime **2026-04-14** (J1 `nodeKey` OTel, payload P1→J1, context evenimente cognitive), checklist **graf (v2) față de runtime** (secțiune dedicată — fiecare rând self-aware cu stare + cale repo). Coloana «În cod (dovadă)» ancorată în fișiere; markerul blochează regenerarea accidentală.

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
- `workers/enrichment/src/workers/j1-grok-structuring.ts` — payload job (`rawData` sau câmpuri plate din P1), prompt, prag încredere, HITL, `withCognitiveSpan("e1:ai:structure-xai", …)` + `buildCognitiveWorkerEventContext` pentru canal SSE.
- `workers/enrichment/src/lib/execution-correlation.ts` — `buildCognitiveWorkerEventContext` / `COGNITIVE_SSE_BATCH_ID_RE` (batchId Redis `cognitive:events:{uuid}`).
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
| 1 | Identitate canonică | **Gap:** `enrich:ai:contact-parse` lipsește din `queue-registry.ts` și din `cognitive-node-catalog.ts` (căutare literală la audit). **Cea mai apropiată** intrare catalog: `nodeKey` `e1:ai:structure-xai`, coadă `ai:structure:xai`. **2026-04-14:** `grokStructuringProcessor` folosește `withCognitiveSpan("e1:ai:structure-xai", …)` — aliniat la catalog; atribute `cognitive.neuronType` / `swimlane` / `etapa` sunt populate când `getNodeByKey` reușește. | v2: `enrich:ai:contact-parse`; v2 cere reconciliere registry. | v2 §2.4 — eticheta graf rămâne distinctă de coada `ai:structure:xai`. |
| 2 | Etapă, familie, swimlane | Etapă **E1** în `main.ts` / `registerCognitiveWorkerEtapa(1)`. Coada runtime `ai:structure:xai` are în catalog `swimlane` **`ai-analysis`** (`cognitive-node-catalog.ts`). Familia v2 **`ai-enrichment`** este etichetă de graf, nu swimlane în catalog. | v2: E1, familie `ai-enrichment`; metrici v2 cu `swimlane="ai-enrichment"`. | Etichetele familie graf vs swimlane catalog coexistă (vezi ADR familie). |
| 3 | Rol declarat | Pentru **implementarea** `ai:structure:xai`: catalog — „Structurare date nestructurate cu AI xAI”. În **J1**, schema JSON cerută include explicit `email`, `telefon`, `website` (`j1-grok-structuring.ts` L151), aliniat semantic cu „contact” din numele v2, fără a echivala formal cele două denumiri. | v2: funcție cognitivă AI structurare/clasificare; analogie corticală prefrontală. | Rolul v2 pe `enrich:ai:contact-parse` nu are intrare catalog separată. |
| 4 | NeuronType + SOFAI | Catalog: `NeuronType.DeliberativeNeuron` pentru `e1:ai:structure-xai`. Clasificare **System 2** (deliberativ) conform v2 §2.1 pentru acest profil. | v2: `DeliberativeNeuron`. | Tipul din catalog se referă la `e1:ai:structure-xai`, nu la `enrich:ai:contact-parse`. |
| 5 | Criticitate | Catalog: **HIGH** pentru `e1:ai:structure-xai`. | v2: **HIGH**. | Aceeași limită ca la rândul 1 (cheie span vs catalog). |
| 6 | Înveliș telemetrie | Span OTel: `cognitive:e1:ai:structure-xai` (`withCognitiveSpan` + `getNodeByKey`). **Evenimente cognitive / SSE:** dacă `correlationId` job este UUID valid pentru contractul din `emitCognitiveEvent`, contextul worker include `batchId` → publicare pe `cognitive:events:{batchId}` (`buildCognitiveWorkerEventContext` în `execution-correlation.ts`). **Faze (`eventType`):** `phase_llm_request`, `phase_llm_response`, `phase_validate_schema`, `phase_hitl_queued`, `phase_silver_write`. **Prometheus:** `cerniq_cognitive_ai_structure_outcome_total`, `cerniq_cognitive_ai_structure_llm_seconds`. **Nu** apare încă `cognitive.enrich.ai.contact-parse` literal din v2. GenAI semconv `gen_ai.*`: neintrodus explicit în J1 la această dată. | v2: span `cognitive.enrich.ai.contact-parse`; mapare `cognitive.neuron.*` vs `cognitive.nodeKey` — ADR-0003. | Redenumire span către convenția v2 rămâne opțională (ADR). |
| 7 | Înveliș politică | **Fără** Cedar/OPA în J1 la audit. Prag comportament: `canAutoApply = confidence >= 0.7` și validare CUI (`j1-grok-structuring.ts` L158–159). Sub prag → `createHitlApprovalTask` (același fișier, L32–45), `expiresInHours: 48` — **nu** „SLA 4h” din v2. | v2: Tier 3, HITL la încredere < 0.80, SLA 4h; Cedar/OPA — destinație documentată. | Praguri și SLA diferă numeric între v2 și implementare; politici OPA neobservate în J1. |
| 8 | Rutare model (dacă AI) | `infraqStructuredJson`: primar `reasoningClient` cu `INFRAQ_REASONING_MODEL` = `Qwen/QwQ-32B-AWQ` (`infraq-structured-json.ts` L36–54, `llm-client.ts` L15); la eșec, `withLlmFallbackChain` + pași frontier (`infraq-structured-json.ts` L36–76). **Nu** este același mecanism textual ca „SGLang guided_json” din v2, dar modelul primar se potrivește denumirii QwQ din v2. | v2: self-hosted-first + fallback la încredere < 0.80; SGLang. | Fallback din v2 e formulat pe încredere; în cod există lanț la erori infraq, nu același trigger. |
| 9 | Guardrails | **Nu** s-au găsit integrări NeMo/Colang în `j1-grok-structuring.ts`. Validare deterministă: `sanitizeCui`, `validateCuiModulo11` înainte de aplicare (`j1-grok-structuring.ts` L155–156). | v2 + ADR-0007: NeMo + verificări deterministe. | NeMo: destinație arhitecturală, neimplementată în fișierul citat. |
| 10 | Escaladare HITL | `createHitlApprovalTask` cu `type: "ai_structuring_review"` când nu se poate aplica automat (`j1-grok-structuring.ts` L32–45). | v2: escaladare la anomalii de încredere; ADR-0008 motor transversal. | Detaliile cozilor `human:*`/`hitl:*` pentru acest flux nu sunt în J1; task creat prin `pipeline-utils`. |
| 11 | Micro-OODA | **Observe:** `resolveGrokStructuringRawData` — `rawData` explicit **sau** câmpuri plate din payload P1 (`cui`, `adresa`, `localitate`, …) când orchestratorul enfilează `ai:structure:xai` fără `rawData` (`j1-grok-structuring.ts`, `p1-orchestrate.ts` `basePayload`). **Orient:** apel `infraqStructuredJson` (LLM). **Decide:** prag `canAutoApply` / rutare HITL. **Act:** update `silverCompanies` + log sau task HITL. **Neo4j GraphRAG:** lipsă — destinație v2/ADR-0005. | v2 OODA + Orient SGLang; GraphRAG — destinație v2. | Stack infraq + frontier; teste: `j1-grok-structuring.integration.test.ts`. |
| 12 | Tier + de-escaladare | **De facto:** sub `confidence >= 0.7` sau CUI invalid → nu auto-aplicare; HITL. **Nu** există în J1 trigger explicit „2σ” sau „schemă API neașteptată” din checklist plan. | v2 §2.2: tier 3 + trigger-e standard. | Invariantele v2 pentru de-escaladare nu sunt toate vizibile în J1. |
| 13 | Stack v2 §2.3 (subset) | **Cu dovadă în ramura citită:** BullMQ (`Job`, procesor în worker enrichment), apel HTTP către infraq reasoning, lanț fallback frontier în `worker-shared`, OpenTelemetry prin `withCognitiveSpan`. **Nu** am auditat Kafka/SGLang/Neo4j pentru acest neuron. | v2 §2.3 + ADR-uri globale. | Stack complet v2: parțial neaudit pentru acest flux. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.contact-parse` și convenții `cognitive.neuron.*` pot apărea în plan.
- **Cod (2026-04-14):** span `cognitive:e1:ai:structure-xai`; atribute catalog populate din `cognitive-node-catalog.ts` pentru `e1:ai:structure-xai`. Sinapsa/matrices CSV `e1:ai:structure-infraq` = etichetă de export — **nu** mai este folosită ca `nodeKey` în J1; vezi ADR `ai-enrichment.md`.
- **Stare:** aliniere `nodeKey` J1 ↔ catalog **îndeplinită**; redenumire span către string-ul v2 rămâne decizie de produs.

### Checklist explicită v2 (graf) ↔ runtime (repo)

Scop: fiecare rând din **Tabel self-aware** are aici o **stare** și o **dovadă** (cale în monorepo), ca să fie clar ce este etichetă de plan (v2) versus ce rulează efectiv. **Acest neuron v2** se mapează pe **o singură** cale runtime: coada `ai:structure:xai` / `e1:ai:structure-xai` (J1).

**Legendă stare:** **Î** = comportament acoperit în cod pentru maparea documentată; **P** = parțial (numeric/semantic diferit față de v2); **G** = gap intenționat sau nume v2 fără echivalent literal în registry; **—** = nu e aplicabil pe această mapare.

| # | Stare | Dovadă în repo (fișier / test) | Notă (v2 vs runtime) |
| --- | --- | --- | --- |
| 1 | G | `workers/shared/src/queue-registry.ts` (`AI_STRUCTURE_XAI`); `packages/shared/src/cognitive-node-catalog.ts` (căutare `e1:ai:structure-xai`); absență `enrich:ai:contact-parse` | Graf: `enrich:ai:contact-parse`. Runtime: `ai:structure:xai`. |
| 2 | Î | `workers/enrichment/src/main.ts` (`registerCognitiveWorkerEtapa`, mapare `ai:structure:xai`); catalog `swimlane` `ai-analysis` | Familie v2 `ai-enrichment` ≠ swimlane catalog; vezi ADR familie. |
| 3 | Î | `workers/enrichment/src/workers/j1-grok-structuring.ts` (prompt + schemă JSON cu câmpuri contact) | Rol similar v2; denumiri cozi diferite. |
| 4 | Î | `packages/shared/src/cognitive-node-catalog.ts` — `NeuronType` pentru `e1:ai:structure-xai` | Tipul e pe `nodeKey` catalog, nu pe string-ul v2 din graf. |
| 5 | Î | Idem catalog — `criticality` pentru `e1:ai:structure-xai` | — |
| 6 | Î | `j1-grok-structuring.ts` (`withCognitiveSpan`, `j1EmitProcessingPhase`); `execution-correlation.ts` (`buildCognitiveWorkerEventContext`); `workers/shared/src/metrics.ts` (`cerniq_cognitive_ai_structure_*`); `j1-grok-structuring.integration.test.ts` (faze + metrici) | Span runtime `cognitive:e1:ai:structure-xai`, nu literalul punctat v2 din plan. |
| 7 | P | `j1-grok-structuring.ts` (`canAutoApply`, `createHitlApprovalTask`, `expiresInHours`) | Prag 0.7 vs 0.80 v2; SLA 48h vs 4h v2; fără OPA. |
| 8 | P | `workers/enrichment/src/lib/infraq-structured-json.ts`; `workers/shared/src/llm-client.ts` (`INFRAQ_REASONING_MODEL`) | Infraq + fallback ≠ textul „SGLang guided_json” din v2. |
| 9 | P | `workers/enrichment/src/lib/cui-validation.ts`; `j1-grok-structuring.ts` | Determinist CUI; fără NeMo în J1. |
| 10 | Î | `j1-grok-structuring.ts`; `workers/enrichment/src/workers/pipeline-utils.ts` (`createHitlApprovalTask`) | Tip task `ai_structuring_review`. |
| 11 | Î | `j1-grok-structuring.ts` (`resolveGrokStructuringRawData`); `p1-orchestrate.ts` (enqueue `ai:structure:xai`); `j1-grok-structuring.integration.test.ts` | GraphRAG v2: neacoperit. |
| 12 | P | `j1-grok-structuring.ts` (prag încredere + CUI) | Fără trigger-e v2 explicite (ex. 2σ). |
| 13 | P | BullMQ + J1 + `withCognitiveSpan` (`workers/shared/src/cognitive-helpers.ts`) | Kafka / SGLang / Neo4j: neafirmate pe acest flux. |

**Regulă de lectură:** pentru **acest** neuron (`enrich:ai:contact-parse`), **G** / **P** înseamnă decalaj de **nume sau praguri** între planul v2 și coada `ai:structure:xai` — nu o evaluare a întregii matrice. Workerul J1 există pe calea mapată; eticheta din graf nu este încă șirul literal BullMQ.
