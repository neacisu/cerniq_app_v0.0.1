<!-- neuron-contract:author-complete -->

# Neuron `silver:dedup:fuzzy-match`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:dedup:fuzzy-match` |
| etapa | E1 |
| familie (v2, prima instanță) | `dedup` |
| contract_path | `contracts/neurons/E1/silver--dedup--fuzzy-match.md` |
| ADR familie (indicativ) | [dedup](../../adr/families/e1/dedup.md) |

## Scop în context real

**v2** plasează neuronul în familia `dedup` pentru potrivire fuzzy pe silver, cu coadă `silver:dedup:fuzzy-match`. În **cod**, coada runtime este **`dedup:fuzzy`**, cu `dedupFuzzyMatchProcessor` în `workers/enrichment/src/workers/m2-dedup-fuzzy-match.ts`, înregistrată în `main.ts` și `queue-registry.ts` (`DEDUP_FUZZY`). Algoritm: scoruri `fuzzball` pe nume/adresă + telefon, praguri `HITL_THRESHOLD = 0.7` și `AUTO_MERGE_THRESHOLD = 0.85` (L24–25), inserare `silverDedupCandidates`, auto-merge sau `hitl_pending` + `createHitlApprovalTask` (L95–146). Prefixul `silver:` din v2 **nu** apare în string-ul cozii din runtime.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`silver:dedup:fuzzy-match\`` (L1851–1871).
- `workers/shared/src/queue-registry.ts` — `DEDUP_FUZZY: "dedup:fuzzy"`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:dedup:fuzzy` / `dedup:fuzzy` (L838–846).
- `workers/enrichment/src/main.ts` — `"dedup:fuzzy": dedupFuzzyMatchProcessor`.
- `workers/enrichment/src/workers/p1-orchestrate.ts` — enqueue `dedup:fuzzy`.
- `workers/enrichment/src/workers/m2-dedup-fuzzy-match.ts` — procesare, praguri, HITL.
- `workers/enrichment/src/workers/critical-workers-integration.test.ts` — mențiuni `dedup:fuzzy` (L203, L239).
- `workers/shared/src/cognitive-helpers.ts`.

## Instanțe v2

### Instanță 1 — `dedup` (v2 ~L1851)

- **Stage:** E1
- **Family:** dedup
- **Inferred neuron type:** AssociativeNeuron
- **Inferred criticality:** MEDIUM
- **Autonomy tier:** Tier 4 (fully autonomous)
- **Contract evidence status (v2):** graph-export-grounded + architecture-enhanced; coadă ne-reconciliată cu registry în v2.

### Extras câmpuri v2 (prima instanță)

- **OODA micro-cycle:** OBSERVE: read multi-source data. ORIENT: correlate patterns. DECIDE: match confidence. ACT: emit association + update graph.
- **Model routing:** Non-AI neuron — deterministic processing.
- **Guardrail/HITL policy:** No mandatory HITL. Audit log 90 days.
- **Prometheus metrics (v2):** `cerniq_neuron_fires_total{neuron_type="AssociativeNeuron",stage="E1",swimlane="dedup"}`
- **OTel span name (v2):** `cognitive.silver.dedup.fuzzy-match`

## N/A pe criterii

- **Rând 8 (Rutare model):** **N/A** — fără LLM; v2 Non-AI; M2 folosește `fuzzball` și reguli SQL.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog:** `nodeKey` `e1:dedup:fuzzy`, coadă `dedup:fuzzy`. **v2** `silver:dedup:fuzzy-match` absent literal din registry. | v2 coadă canonică. | Prefix `silver:` vs `dedup:` — decalaj documentat. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog `dedup-scoring`; familie v2 `dedup`. | v2. | — |
| 3 | Rol declarat | Catalog: deduplicare fuzzy (Levenshtein, n-grame). Cod: `fuzzball` ratio/token/partial (`m2-dedup-fuzzy-match.ts` L27–32, L71–88). | v2: dedup fuzzy silver. | Text catalog menționează Levenshtein; implementarea e via fuzzball. |
| 4 | NeuronType + SOFAI | `AssociativeNeuron`; **System 1** operațional. | v2. | — |
| 5 | Criticitate | **MEDIUM** (catalog). | v2 **MEDIUM**. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:dedup:fuzzy", …)` → `cognitive:e1:dedup:fuzzy` (L35–38). Nu numele v2 `cognitive.silver.dedup.fuzzy-match`. | v2 span. | Aliniere naming. |
| 7 | Înveliș politică | Praguri 0.7 / 0.85; `createHitlApprovalTask` sub auto-merge (L125–145). Fără OPA. | v2 fără HITL obligatoriu. | HITL explicit în M2. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Praguri + filtre CUI/nrRegCom înainte de scor (L71–78); fără NeMo. | v2 audit. | NeMo N/A. |
| 10 | Escaladare HITL | `createHitlApprovalTask` tip `dedup_review` (L129–145). | ADR-0008. | — |
| 11 | Micro-OODA | Încărcare companie → candidați același județ → scor → candidat DB / merge / HITL. GraphRAG: lipsă. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Auto-merge doar peste 0.85; altfel HITL. | v2 Tier 4. | Tensiune Tier 4 vs HITL. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, `fuzzball`, Postgres, OTel. | v2 subset. | Kafka/Neo4j neaudit. |

### Mapare OTel

- **v2:** `cognitive.silver.dedup.fuzzy-match`.
- **Cod:** `cognitive:e1:dedup:fuzzy`; atribute catalog OK.
- **Stare 2026-04-11:** nume span diferă de v2.
