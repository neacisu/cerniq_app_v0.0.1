<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:industry-classify`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

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
- `workers/enrichment/src/workers/l4-culturi-classifier.ts` — `withCognitiveSpan("e1:agri:culturi", …)` (L36–39).
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
| 1 | Identitate canonică | **Gap** pentru `enrich:ai:industry-classify` în registry/catalog. **Două** `nodeKey` runtime apropiate semantic: `e1:ai:structure-xai` (`ai:structure:xai`) și `e1:agri:culturi` (`agri:culturi`). Aceeași observație ca la J1: `withCognitiveSpan("e1:ai:structure-infraq", …)` în `j1-grok-structuring.ts` L123–124 nu există în catalog (doar `e1:ai:structure-xai`). | v2 coadă canonică `enrich:ai:industry-classify`. | Fără mapare ADR 1:1, identitatea v2 rămâne doar în graf. |
| 2 | Etapă, familie, swimlane | **J1:** E1, catalog swimlane `ai-analysis` pentru `e1:ai:structure-xai`. **L4:** E1, catalog swimlane `enrichment-external` pentru `e1:agri:culturi` (secțiune catalog agri). Familie v2 `ai-enrichment` ≠ swimlane catalog. | v2: E1, familie `ai-enrichment`. | Trei etichete paralele (familie graf / swimlane AI / swimlane agri). |
| 3 | Rol declarat | **J1:** extragere `cod_caen_principal`, `is_agricol` din text JSON (industrie/agricol). **L4:** „Catalogare” culturi pe CAEN + cuvinte cheie (`l4-culturi-classifier.ts` L17–34). | v2: AI structurare/clasificare; analogie prefrontală. | „Industry-classify” v2 nu are handler dedicat cu același nume. |
| 4 | NeuronType + SOFAI | **J1:** `DeliberativeNeuron` (catalog). **L4:** `KnowledgeNeuron` (catalog). **SOFAI:** J1 → System 2; L4 → mai apropiat de procesare simbolică (non-LLM în codul citit). | v2: `DeliberativeNeuron`, System 2. | L4 nu urmează profilul Deliberative din v2 pentru acest neuron-graf. |
| 5 | Criticitate | Catalog: **HIGH** (J1), **LOW** (L4 `e1:agri:culturi`). | v2: **HIGH**. | Criticitatea L4 nu se aliniază cu v2 pentru `industry-classify`. |
| 6 | Înveliș telemetrie | **J1:** span `cognitive:e1:ai:structure-infraq` (vezi contract `enrich:ai:contact-parse`). **L4:** span `cognitive:e1:agri:culturi` (`withCognitiveSpan` L37–38). **Niciunul** nu folosește numele v2 `cognitive.enrich.ai.industry-classify`. | v2 span denumit `cognitive.enrich.ai.industry-classify`. | Două instrumentări separate; aliniere naming nefăcută. |
| 7 | Înveliș politică | **J1:** prag încredere + HITL (`j1-grok-structuring.ts` L158–168, L32–45). **L4:** fără Cedar/OPA în fișierul citit. | v2 Tier 3 + HITL sub 0.80; Cedar țintă. | Politici diferite între ramuri; OPA neaudit în L4. |
| 8 | Rutare model (dacă AI) | **J1:** `infraqStructuredJson` + `INFRAQ_REASONING_MODEL` (aceeași infrastructură ca `enrich:ai:contact-parse`). **L4:** **N/A** apel LLM (vezi secțiunea N/A). | v2 rutare QwQ + SGLang + fallback încredere. | Două modele operaționale; doar J1 e LLM. |
| 9 | Guardrails | **J1:** validări CUI deterministe; fără NeMo în fișierul citit. **L4:** mapări statice `CULTURES_MAP` + regex (L17–34). | v2 NeMo + determinist. | NeMo neimplementat în ambele căi la audit. |
| 10 | Escaladare HITL | **J1:** `createHitlApprovalTask` la nevoie. **L4:** `l4-culturi-classifier.ts` citit integral (L1–124): **fără** `createHitlApprovalTask` sau cozi `human:*`/`hitl:*`. | v2 + ADR-0008. | L4 nu escaladează la HITL în implementarea citită. |
| 11 | Micro-OODA | **J1:** flux Observe→Act ca la contact-parse. **L4:** Observe (încărcare companie), Orient (determineCategory), Decide/Act (persistență în DB — continuare în fișier). **GraphRAG Neo4j:** lipsă în fragmentele citite. | v2 OODA + GraphRAG țintă. | OODA detaliat L4 necesită citire completă fișier. |
| 12 | Tier + de-escaladare | **J1:** HITL sub prag încredere (0.7 în cod). **L4:** fără prag de încredere LLM. | v2 tier 3 + trigger-e standard. | De-escaladare v2 nu mapă direct pe L4. |
| 13 | Stack v2 §2.3 (subset) | BullMQ + worker enrichment; LLM prin infraq în J1; euristică locală în L4. Kafka/SGLang/Neo4j: neaudit pentru aceste ramuri în sesiunea curentă. | v2 §2.3. | Stack parțial. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.industry-classify`.
- **Cod:** `cognitive:e1:ai:structure-infraq` (J1) și `cognitive:e1:agri:culturi` (L4); atribute catalog populate pentru L4 (cheie existentă), potențial incomplete pentru J1 din cauza `nodeKey` greșit.
- **Stare 2026-04-11:** nealiniat la o singură identitate OTel pentru eticheta v2.
