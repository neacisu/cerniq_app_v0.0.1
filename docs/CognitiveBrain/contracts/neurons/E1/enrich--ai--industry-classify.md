<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:industry-classify`

> **Perimetru:** contract **doar** pentru acest neuron din plan (~L1763). Mențiunile despre J1 și L4 sunt **numai** maparea runtime pentru **această** etichetă v2 (industry-classify), nu „toți neuronii agri” sau matricea întreagă. Celelalte două neuroni din triplet au propriile contracte.  
> **Status:** audit manual **2026-04-11**, actualizare runtime **2026-04-14** (J1 `nodeKey`, trigger P1 → `agri:culturi`, context SSE L4), checklist **graf (v2) față de runtime** (J1 vs L4 pe fiecare criteriu). Coloana «În cod (dovadă)» ancorată în fișiere.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:ai:industry-classify` |
| etapa | E1 |
| familie (v2, prima instanță) | `ai-enrichment` |
| contract_path | `contracts/neurons/E1/enrich--ai--industry-classify.md` |
| ADR familie (indicativ) | [ai-enrichment](../../adr/families/e1/ai-enrichment.md) |

## Scop în context real

**v2** plasează neuronul în familia `ai-enrichment` ca AI deliberativ pentru structurare/clasificare, cu coadă `enrich:ai:industry-classify`. În **cod**, această coadă **nu** apare în `queue-registry.ts` sau ca `queueName` în `cognitive-node-catalog.ts`. Conform **ADR-FAMILY-e1-ai-enrichment**, etichetele `enrich:ai:*` din graf nu sunt egale cu cozile `ai:*` fără mapare documentată. Două ramuri **distincte** din enrichment worker se apropie semantic de „industrie/sector”, fără a reproduce numele v2: (1) **J1** (`ai:structure:xai`, `j1-grok-structuring.ts`) extrage prin LLM `cod_caen_principal` și `is_agricol` în schema JSON (L151); (2) **L4** (`agri:culturi`, `l4-culturi-classifier.ts`) clasifică culturi pe baza CAEN + liste euristice, fără LLM în fragmentul citit (L17–34, L36–). Nu există dovadă că v2 `industry-classify` este implementat ca neuron izolat cu aceeași coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:ai:industry-classify\`` (L1763–1783).
- `docs/CognitiveBrain/adr/families/e1/ai-enrichment.md`.
- `workers/shared/src/queue-registry.ts` — absență `enrich:ai:industry-classify`; `AI_STRUCTURE_XAI`, `agri:culturi` (verificat prin căutare `agri:` în registry).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:ai:structure-xai`, intrări agri (ex. `e1:agri:culturi` / `agri:culturi` în jurul L818–826).
- `workers/enrichment/src/workers/j1-grok-structuring.ts` — schema JSON și câmpuri CAEN/agricol (L145–152).
- `workers/enrichment/src/workers/l4-culturi-classifier.ts` — `withCognitiveSpan("e1:agri:culturi", …)` + `buildCognitiveWorkerEventContext`.
- `workers/enrichment/src/workers/p1-orchestrate.ts` — pentru `codCaenPrincipal` agricol (`01*`,`02*`,`03*`), enqueue `agri:culturi` cu `{ tenantId, companyId, correlationId, codCaen }` (în plus față de `agri:apia`).
- `workers/enrichment/src/main.ts` — înregistrare procesoare `ai:structure:xai`, `agri:culturi` (hartă procesori).

## Instanțe v2

### Instanță 1 — `ai-enrichment` (v2 ~L1763)

- **Stage:** E1
- **Family:** ai-enrichment
- **Inferred neuron type:** DeliberativeNeuron
- **Inferred criticality:** HIGH
- **Autonomy tier:** Tier 3 (act with oversight)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coadă ne-reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: load context. ORIENT: LLM reasoning (SGLang structured output). DECIDE: confidence gate (>0.80 pass). ACT: emit decision + episodic memory update.
- **Model routing (v2):** PRIMARY: vllm-reasoning-32b (QwQ-32B-AWQ). FALLBACK: frontier if confidence < 0.80. SGLang guided_json.
- **Guardrail/HITL policy (v2):** HITL on anomaly (confidence < 0.80). SLA: 4h.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="DeliberativeNeuron",stage="E1",swimlane="ai-enrichment"}`
- **OTel span name (v2):** `cognitive.enrich.ai.industry-classify`

## N/A pe criterii

- **Rând 8 (Rutare model):** parțial **N/A** pentru coada **L4 `agri:culturi`**: clasificarea citată este euristică/deterministă, fără apel LLM în `l4-culturi-classifier.ts` (audit 2026-04-11). Rândul rămâne relevant pentru ramura J1 (LLM).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:ai:industry-classify` în registry/catalog. **Două** `nodeKey` runtime: `e1:ai:structure-xai` (`ai:structure:xai`) și `e1:agri:culturi` (`agri:culturi`). **2026-04-14:** J1 folosește `e1:ai:structure-xai` pe span (catalog valid). L4 declanșat din P1 când CAEN agricol (dovadă `p1-orchestrate.ts`). | v2 coadă canonică `enrich:ai:industry-classify`. | Eticheta v2 rămâne în graf; runtime = două cozi. |
| 2 | Etapă, familie, swimlane | **J1:** E1, catalog swimlane `ai-analysis` pentru `e1:ai:structure-xai`. **L4:** E1, catalog swimlane `enrichment-external` pentru `e1:agri:culturi` (secțiune catalog agri). Familie v2 `ai-enrichment` ≠ swimlane catalog. | v2: E1, familie `ai-enrichment`. | Trei etichete paralele (familie graf / swimlane AI / swimlane agri). |
| 3 | Rol declarat | **J1:** extragere `cod_caen_principal`, `is_agricol` din text JSON (industrie/agricol). **L4:** „Catalogare” culturi pe CAEN + cuvinte cheie (`l4-culturi-classifier.ts` L17–34). | v2: AI structurare/clasificare; analogie prefrontală. | „Industry-classify” v2 nu are handler dedicat cu același nume. |
| 4 | NeuronType + SOFAI | **J1:** `DeliberativeNeuron` (catalog). **L4:** `KnowledgeNeuron` (catalog). **SOFAI:** J1 → System 2; L4 → mai apropiat de procesare simbolică (non-LLM în codul citit). | v2: `DeliberativeNeuron`, System 2. | L4 nu urmează profilul Deliberative din v2 pentru acest neuron-graf. |
| 5 | Criticitate | Catalog: **HIGH** (J1), **LOW** (L4 `e1:agri:culturi`). | v2: **HIGH**. | Criticitatea L4 nu se aliniază cu v2 pentru `industry-classify`. |
| 6 | Înveliș telemetrie | **J1:** span `cognitive:e1:ai:structure-xai` + atribute catalog; evenimente cognitive cu `batchId` când `correlationId` UUID SSE; faze `phase_*` ca la contact-parse; metrici `cerniq_cognitive_ai_structure_*`. **L4:** span `cognitive:e1:agri:culturi` + același pattern context SSE; faze `phase_classify_start`, `phase_not_found`, `phase_metadata_persisted`; metrică `cerniq_cognitive_agri_culturi_outcome_total`. **Niciunul** nu folosește literal v2 `cognitive.enrich.ai.industry-classify`. | v2 span denumit `cognitive.enrich.ai.industry-classify`. | Două instrumentări separate; naming v2 opțional ulterior. |
| 7 | Înveliș politică | **J1:** prag încredere + HITL (`j1-grok-structuring.ts` L158–168, L32–45). **L4:** fără Cedar/OPA în fișierul citit. | v2 Tier 3 + HITL sub 0.80; Cedar — destinație documentată. | Politici diferite între ramuri; OPA neaudit în L4. |
| 8 | Rutare model (dacă AI) | **J1:** `infraqStructuredJson` + `INFRAQ_REASONING_MODEL` (aceeași infrastructură ca `enrich:ai:contact-parse`). **L4:** **N/A** apel LLM (vezi secțiunea N/A). | v2 rutare QwQ + SGLang + fallback încredere. | Două modele operaționale; doar J1 e LLM. |
| 9 | Guardrails | **J1:** validări CUI deterministe; fără NeMo în fișierul citit. **L4:** mapări statice `CULTURES_MAP` + regex (L17–34). | v2 NeMo + determinist. | NeMo neimplementat în ambele căi la audit. |
| 10 | Escaladare HITL | **J1:** `createHitlApprovalTask` la nevoie. **L4:** `l4-culturi-classifier.ts` citit integral (L1–124): **fără** `createHitlApprovalTask` sau cozi `human:*`/`hitl:*`. | v2 + ADR-0008. | L4 nu escaladează la HITL în implementarea citită. |
| 11 | Micro-OODA | **J1:** flux Observe→Act ca la contact-parse. **L4:** Observe (încărcare companie), Orient (determineCategory), Decide/Act (persistență în DB — continuare în fișier). **GraphRAG Neo4j:** lipsă în fragmentele citite. | v2 OODA + GraphRAG — destinație v2. | OODA detaliat L4 necesită citire completă fișier. |
| 12 | Tier + de-escaladare | **J1:** HITL sub prag încredere (0.7 în cod). **L4:** fără prag de încredere LLM. | v2 tier 3 + trigger-e standard. | De-escaladare v2 nu mapă direct pe L4. |
| 13 | Stack v2 §2.3 (subset) | BullMQ + worker enrichment; LLM prin infraq în J1; euristică locală în L4. Kafka/SGLang/Neo4j: neaudit pentru aceste ramuri în sesiunea curentă. | v2 §2.3. | Stack parțial. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.industry-classify`.
- **Cod (2026-04-14):** `cognitive:e1:ai:structure-xai` (J1) și `cognitive:e1:agri:culturi` (L4); ambele chei există în catalog — atribute `cognitive.neuronType` etc. populate când `getNodeByKey` reușește.
- **Stare:** J1 aliniat catalog; L4 cu trigger orchestrator pentru flux agricol standard; identitate unică v2 rămâne documentară.

### Checklist explicită v2 (graf) ↔ runtime (repo)

Scop: fiecare rând din **Tabel self-aware** are **stare** + **dovadă**, cu distincție clară între eticheta v2 și **două** căi runtime (**J1** = LLM + CAEN în structurare; **L4** = `agri:culturi` euristic). Coloana **Ramură** indică unde se aplică dovada.

**Legendă stare:** **Î** = acoperit pe ramura indicată; **P** = parțial față de v2; **G** = gap de nume (v2 ≠ coadă registry) sau lipsă echivalent literal; **—** = N/A pe ramura respectivă (ex. LLM pe L4).

| # | Stare | Ramură | Dovadă în repo (fișier / test) | Notă (v2 vs runtime) |
| --- | --- | --- | --- | --- |
| 1 | G | J1+L4 | `queue-registry.ts` (`AI_STRUCTURE_XAI`, `agri:culturi`); catalog `e1:ai:structure-xai`, `e1:agri:culturi` | Un singur neuron v2 în graf → două cozi runtime. |
| 2 | Î | J1 | `main.ts`, `cognitive-node-catalog.ts` (`ai-analysis`) | Familie v2 `ai-enrichment` ≠ swimlane. |
| 2 | Î | L4 | `cognitive-node-catalog.ts` (`e1:agri:culturi`, swimlane agri) | Idem. |
| 3 | Î | J1 | `j1-grok-structuring.ts` (schema `cod_caen_principal`, `is_agricol`) | — |
| 3 | Î | L4 | `l4-culturi-classifier.ts` (`CULTURES_MAP`, `determineCategory`) | Fără LLM în L4. |
| 4 | P | J1 | Catalog `DeliberativeNeuron` pentru `e1:ai:structure-xai` | — |
| 4 | P | L4 | Catalog `KnowledgeNeuron` pentru `e1:agri:culturi` | Profil v2 „Deliberative” nu se aplică literal pe L4. |
| 5 | P | J1 | Catalog criticitate **HIGH** (`e1:ai:structure-xai`) | — |
| 5 | P | L4 | Catalog criticitate **LOW** (`e1:agri:culturi`) | Decalaj față de v2 (HIGH unic). |
| 6 | Î | J1 | `j1-grok-structuring.ts`; `metrics.ts` (`cerniq_cognitive_ai_structure_*`); `j1-grok-structuring.integration.test.ts` | Span `cognitive:e1:ai:structure-xai`. |
| 6 | Î | L4 | `l4-culturi-classifier.ts` (`l4EmitPhase`); `metrics.ts` (`cerniq_cognitive_agri_culturi_outcome_total`); `l4-culturi-classifier.integration.test.ts` | Span `cognitive:e1:agri:culturi`. |
| 7 | P | J1 | `j1-grok-structuring.ts` (prag, HITL) | — |
| 7 | P | L4 | `l4-culturi-classifier.ts` | Fără OPA / același prag ca J1. |
| 8 | Î | J1 | `infraq-structured-json.ts`, `llm-client.ts` | — |
| 8 | — | L4 | `l4-culturi-classifier.ts` (fără apel LLM) | Rând N/A LLM pe L4 (deja în secțiunea «N/A pe criterii»). |
| 9 | P | J1 | `cui-validation.ts`, `j1-grok-structuring.ts` | Fără NeMo. |
| 9 | P | L4 | `l4-culturi-classifier.ts` (mapă statică + regex) | — |
| 10 | Î | J1 | `pipeline-utils.ts`, `j1-grok-structuring.ts` | — |
| 10 | G | L4 | `l4-culturi-classifier.ts` (integral) | Fără `createHitlApprovalTask` / HITL în L4. |
| 11 | Î | J1 | `j1-grok-structuring.ts`, `p1-orchestrate.ts`, teste J1 | GraphRAG v2: neacoperit. |
| 11 | Î | L4 | `l4-culturi-classifier.ts`; `p1-orchestrate.ts` (enqueue `agri:culturi`); `l4-culturi-classifier.integration.test.ts` | OODA L4: încărcare companie → clasificare → persistență. |
| 12 | P | J1 | `j1-grok-structuring.ts` | — |
| 12 | P | L4 | L4 (fără prag LLM) | De-escaladare v2 nu mapă 1:1. |
| 13 | P | J1+L4 | `main.ts`, J1/L4 workers | Stack v2 complet: parțial neaudit (Kafka/SGLang/Neo4j). |

**Regulă de lectură:** **doar** pentru neuronul `enrich:ai:industry-classify`, rândurile cu **două ramuri** înseamnă că eticheta v2 din plan este acoperită prin **compunerea** J1 + L4 (L4 doar când P1 enfilează `agri:culturi` pentru CAEN agricol) — nu că am documentat sau implementat alți neuroni în afara acestui contract.
