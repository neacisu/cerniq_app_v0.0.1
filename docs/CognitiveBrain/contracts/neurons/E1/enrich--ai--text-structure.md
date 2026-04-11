<!-- neuron-contract:author-complete -->

# Neuron `enrich:ai:text-structure`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:ai:text-structure` |
| etapa | E1 |
| familie (v2, prima instanță) | `ai-enrichment` |
| contract_path | `contracts/neurons/E1/enrich--ai--text-structure.md` |
| ADR familie (indicativ) | [ai-enrichment](../../adr/families/e1/ai-enrichment.md) |

## Scop în context real

**v2** descrie un neuron AI pentru structurarea datelor neuniforme, cu coadă `enrich:ai:text-structure`. În **repo**, coada literală lipsește din registry și catalog. **ADR-FAMILY-e1-ai-enrichment** explică decalajul `enrich:ai:*` vs `ai:*`. Cea mai bună **potrivire semantică documentată**: workerul **J1** pe coada `ai:structure:xai` (`grokStructuringProcessor`), care primește `rawData` nestructurat și cere un obiect JSON cu câmpuri normalizate (`j1-grok-structuring.ts` L145–152), adică exact „text/JSON → structură”. Nu s-a găsit o mapare formală care să echivaleze numele v2 cu `ai:structure:xai`.

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
| 1 | Identitate canonică | **Gap** pentru `enrich:ai:text-structure`. Catalog/runtime pentru structurare: `e1:ai:structure-xai` / `ai:structure:xai`. **Divergență** `e1:ai:structure-infraq` în J1 (lipsește din catalog) — vezi `enrich:ai:contact-parse`. | v2 coadă canonică. | Mapare graf→runtime neînchisă. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog **`ai-analysis`** pentru `e1:ai:structure-xai`; familie v2 `ai-enrichment` (graf). | v2 E1 + familie `ai-enrichment`. | Idem celelalte `enrich:ai:*`. |
| 3 | Rol declarat | Catalog: „Structurare date nestructurate cu AI xAI”. Implementare: normalizare JSON companie din `rawData`. | v2: AI structurare text/date neuniforme. | Denumiri diferite, rol similar. |
| 4 | NeuronType + SOFAI | `DeliberativeNeuron`; System 2 conform v2 pentru profilul AI deliberativ. | v2 `DeliberativeNeuron`. | — |
| 5 | Criticitate | Catalog **HIGH** pentru `e1:ai:structure-xai`. | v2 **HIGH**. | — |
| 6 | Înveliș telemetrie | Span `cognitive:e1:ai:structure-infraq`; nu `cognitive.enrich.ai.text-structure` din v2. Atribute catalog condiționate de `getNodeByKey` — cheie greșită în J1. | v2 naming OTel. | Migrare necesară (nodeKey + span). |
| 7 | Înveliș politică | Prag 0.7 + validare CUI; HITL cu expirare 48h (`j1-grok-structuring.ts`). Fără OPA. | v2 Tier 3, prag 0.80, SLA 4h. | Praguri/SLA diferite. |
| 8 | Rutare model (dacă AI) | `infraqStructuredJson` + `Qwen/QwQ-32B-AWQ` + lanț frontier (`infraq-structured-json.ts`, `llm-client.ts`). | v2 QwQ + SGLang + fallback încredere. | SGLang ca text nu apare în implementarea citită. |
| 9 | Guardrails | Validări deterministe CUI; fără NeMo în J1 citit. | v2 + ADR-0007. | NeMo țintă. |
| 10 | Escaladare HITL | `createHitlApprovalTask` pentru cazuri sub prag (`j1-grok-structuring.ts` L32–45). | v2 anomalii încredere. | — |
| 11 | Micro-OODA | **Observe:** `rawData` job. **Orient:** LLM structurat. **Decide:** `canAutoApply`. **Act:** scriere silver + log / HITL. **Neo4j GraphRAG:** lipsă în codul citit. | v2 OODA + GraphRAG țintă. | — |
| 12 | Tier + de-escaladare | HITL când sub prag încredere / CUI invalid; fără trigger2σ explicit. | v2 §2.2. | Invariante parțiale în cod. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, worker enrichment, infraq reasoning, OTel helper. | v2 stack complet. | Kafka/SGLang/Neo4j neaudit aici. |

### Mapare OTel

- **v2:** `cognitive.enrich.ai.text-structure`.
- **Cod:** `cognitive:e1:ai:structure-infraq` + atribute condiționate; aliniază la `e1:ai:structure-xai` pentru metadata catalog.
- **Stare 2026-04-11:** migrare recomandată (cheie + nume span).
