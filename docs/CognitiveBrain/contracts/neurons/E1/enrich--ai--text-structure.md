<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:text-structure`

> **Perimetru:** contract **doar** pentru acest neuron din plan (~L1785). Partajarea procesorului J1 cu `enrich:ai:contact-parse` este o **constatare de mapare cod**, nu dublarea raportării „încă un neuron implementat” — în plan rămân **trei** intrări v2 distincte, fiecare cu contractul ei.  
> **Status:** audit manual **2026-04-11**, actualizare runtime **2026-04-14** (J1 `nodeKey`, reconciliere `structure-infraq` vs catalog, payload P1), checklist **graf (v2) față de runtime** (alias matrice vs `e1:ai:structure-xai`). Coloana «În cod (dovadă)» ancorată în fișiere.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:ai:text-structure` |
| etapa | E1 |
| familie (v2, prima instanță) | `ai-enrichment` |
| contract_path | `contracts/neurons/E1/enrich--ai--text-structure.md` |
| ADR familie (indicativ) | [ai-enrichment](../../adr/families/e1/ai-enrichment.md) |

## Scop în context real

**v2** descrie un neuron AI pentru structurarea datelor neuniforme, cu coadă `enrich:ai:text-structure`. În **repo**, coada literală lipsește din registry și catalog. **ADR-FAMILY-e1-ai-enrichment** explică decalajul `enrich:ai:*` vs `ai:*`. Cea mai bună **potrivire semantică documentată**: workerul **J1** pe coada `ai:structure:xai` (`grokStructuringProcessor`), care primește `rawData` nestructurat **sau** câmpuri plate din orchestrator și cere un obiect JSON cu câmpuri normalizate — „text/JSON → structură”. Eticheta CSV `e1:ai:structure-infraq` nu are intrare separată în catalog; span-ul J1 este **`e1:ai:structure-xai`** (vezi ADR).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:ai:text-structure\`` (L1785–1805).
- `docs/CognitiveBrain/adr/families/e1/ai-enrichment.md`.
- `workers/shared/src/queue-registry.ts` — `AI_STRUCTURE_XAI` → `ai:structure:xai`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:ai:structure-xai`.
- `workers/enrichment/src/main.ts` — procesor `ai:structure:xai`.
- `workers/enrichment/src/workers/p1-orchestrate.ts` — enqueue `ai:structure:xai` (L144–145).
- `workers/enrichment/src/workers/j1-grok-structuring.ts` — procesare + `withCognitiveSpan` (L122–199).
- `workers/enrichment/src/lib/infraq-structured-json.ts`.
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`.
- `workers/enrichment/src/workers/j1-grok-structuring.integration.test.ts`.

## Instanțe v2

### Instanță 1 — `ai-enrichment` (v2 ~L1785)

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
- **OTel span name (v2):** `cognitive.enrich.ai.text-structure`

## N/A pe criterii

Nu s-a marcat **N/A** pe rânduri întregi: toate criteriile primesc fie dovezi pe ramura `ai:structure:xai`, fie gap explicit față de v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:ai:text-structure`. Catalog/runtime: `e1:ai:structure-xai` / `ai:structure:xai`. **2026-04-14:** J1 folosește explicit `e1:ai:structure-xai` ca `nodeKey` OTel — **fără** cheie paralelă `e1:ai:structure-infraq` în cod. Export CSV/matrici poate lista `e1:ai:structure-infraq` ca sinapsă semantică; interpretare: alias documentar → același procesor J1. | v2 coadă canonică. | Mapare graf→runtime neînchisă pentru eticheta v2. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog **`ai-analysis`** pentru `e1:ai:structure-xai`; familie v2 `ai-enrichment` (graf). | v2 E1 + familie `ai-enrichment`. | Idem celelalte `enrich:ai:*`. |
| 3 | Rol declarat | Catalog: „Structurare date nestructurate cu AI xAI”. Implementare: normalizare JSON companie din `resolveGrokStructuringRawData` (`rawData` sau payload P1). | v2: AI structurare text/date neuniforme. | Denumiri diferite, rol similar. |
| 4 | NeuronType + SOFAI | `DeliberativeNeuron`; System 2 conform v2 pentru profilul AI deliberativ. | v2 `DeliberativeNeuron`. | — |
| 5 | Criticitate | Catalog **HIGH** pentru `e1:ai:structure-xai`. | v2 **HIGH**. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e1:ai:structure-xai`; evenimente `node_*` pe canal Redis per `batchId` când corelația e UUID valid; faze `phase_llm_request`, `phase_llm_response`, `phase_validate_schema`, `phase_hitl_queued`, `phase_silver_write`; metrici `cerniq_cognitive_ai_structure_outcome_total`, `cerniq_cognitive_ai_structure_llm_seconds`. Nu `cognitive.enrich.ai.text-structure` literal din v2. | v2 naming OTel. | Redenumire span v2 = decizie viitoare. |
| 7 | Înveliș politică | Prag 0.7 + validare CUI; HITL cu expirare 48h (`j1-grok-structuring.ts`). Fără OPA. | v2 Tier 3, prag 0.80, SLA 4h. | Praguri/SLA diferite. |
| 8 | Rutare model (dacă AI) | `infraqStructuredJson` + `Qwen/QwQ-32B-AWQ` + lanț frontier (`infraq-structured-json.ts`, `llm-client.ts`). | v2 QwQ + SGLang + fallback încredere. | SGLang ca text nu apare în implementarea citită. |
| 9 | Guardrails | Validări deterministe CUI; fără NeMo în J1 citit. | v2 + ADR-0007. | NeMo destinație. |
| 10 | Escaladare HITL | `createHitlApprovalTask` pentru cazuri sub prag (`j1-grok-structuring.ts` L32–45). | v2 anomalii încredere. | — |
| 11 | Micro-OODA | **Observe:** `rawData` sau câmpuri plate din job (P1). **Orient:** LLM structurat. **Decide:** `canAutoApply`. **Act:** scriere silver + log / HITL. **Neo4j GraphRAG:** lipsă. | v2 OODA + GraphRAG — destinație v2. | Teste: `j1-grok-structuring.integration.test.ts`. |
| 12 | Tier + de-escaladare | HITL când sub prag încredere / CUI invalid; fără trigger2σ explicit. | v2 §2.2. | Invariante parțiale în cod. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, worker enrichment, infraq reasoning, OTel helper. | v2 stack complet. | Kafka/SGLang/Neo4j neaudit aici. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.text-structure`.
- **Cod (2026-04-14):** `cognitive:e1:ai:structure-xai` + atribute catalog complete. `e1:ai:structure-infraq` din matrice = **alias documentar** (fără `nodeKey` duplicat în cod).
- **Stare:** migrare cheie span **îndeplinită**; opțional: redenumire către string v2.

### Checklist explicită v2 (graf) ↔ runtime (repo)

Scop: **pentru `enrich:ai:text-structure` singur**, calea runtime este J1 pe `ai:structure:xai` — **aceeași coadă** ca la `enrich:ai:contact-parse`, dar **contractul acesta** leagă **doar** eticheta text-structure de cod (cele trei contracte din plan rămân trei fișiere distincte). Matricea CSV poate folosi `e1:ai:structure-infraq`; în cod, `nodeKey` OTel este **`e1:ai:structure-xai`**.

**Legendă stare:** **Î** = acoperit; **P** = parțial față de v2; **G** = gap de nume în registry; **—** = neaplicabil.

| # | Stare | Dovadă în repo (fișier / test) | Notă (v2 vs runtime) |
| --- | --- | --- | --- |
| 1 | G | `queue-registry.ts`; `cognitive-node-catalog.ts`; `j1-grok-structuring.ts` (`withCognitiveSpan("e1:ai:structure-xai")`) | Graf: `enrich:ai:text-structure` / sinapsă `e1:ai:structure-infraq`. Runtime: `ai:structure:xai`. |
| 2 | Î | `main.ts`; catalog `ai-analysis` | Familie v2 `ai-enrichment` vs swimlane catalog — ADR. |
| 3 | Î | `j1-grok-structuring.ts` (`resolveGrokStructuringRawData`, prompt structurare) | „Text nestructurat → JSON” aliniat semantic cu v2. |
| 4 | Î | `cognitive-node-catalog.ts` — `e1:ai:structure-xai` | — |
| 5 | Î | Idem — criticitate | — |
| 6 | Î | `j1-grok-structuring.ts`; `execution-correlation.ts`; `metrics.ts` (`cerniq_cognitive_ai_structure_*`); `j1-grok-structuring.integration.test.ts` | Span runtime ≠ string punctat v2 din plan. |
| 7 | P | `j1-grok-structuring.ts` | Prag / SLA vs v2; fără OPA. |
| 8 | P | `infraq-structured-json.ts`; `llm-client.ts` | — |
| 9 | P | `cui-validation.ts`; `j1-grok-structuring.ts` | NeMo: destinație. |
| 10 | Î | `pipeline-utils.ts`; `j1-grok-structuring.ts` | — |
| 11 | Î | `j1-grok-structuring.ts`; `p1-orchestrate.ts`; `j1-grok-structuring.integration.test.ts` | GraphRAG v2: neacoperit. |
| 12 | P | `j1-grok-structuring.ts` | Fără trigger-e v2 explicite suplimentare. |
| 13 | P | BullMQ + J1 + `cognitive-helpers.ts` | Stack v2 complet: parțial neaudit. |

**Regulă de lectură:** `e1:ai:structure-infraq` din **NEURON_MATRIX** / CSV este **alias documentar** către același procesor ca `e1:ai:structure-xai`; nu există a doua intrare de coadă în `queue-registry.ts` pentru infraq.
