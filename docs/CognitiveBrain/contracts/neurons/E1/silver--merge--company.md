<!-- neuron-contract:author-complete -->

# Neuron `silver:merge:company`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:merge:company` |
| etapa | E1 |
| familie (v2, prima instanță) | `merge` |
| contract_path | `contracts/neurons/E1/silver--merge--company.md` |
| ADR familie (indicativ) | [merge](../../adr/families/e1/merge.md) |

## Scop în context real

**v2** descrie **`silver:merge:company`** ca AssociativeNeuron care corelează surse multiple și actualizează agregatul silver companie. **Nu** există coadă BullMQ sau `nodeKey` cu acest nume. **Comportamente înrudite în E1:** (1) **`pipeline:promote:bronze-silver`** — promovare bronze→silver cu `mergeWithSource` și alte rezolvări câmp (prioritate excel vs ANAF etc.) în `promotion-bronze-silver.ts`; span `e1:pipeline:promote-bronze-silver`. (2) **`ai:merge:xai`** — fuziune ghidată de model multi-sursă în `j2-ai-data-merger.ts` (InfraQ), cu HITL sub prag de încredere; coada din catalog este `ai:merge:xai`, dar `withCognitiveSpan` folosește **`e1:ai:merge-infraq`** (divergență față de `e1:ai:merge-xai` din catalog). **Concluzie:** v2_queue **gap**; capacitățile reale sunt **împărțite** între promovare deterministă și merge AI pe alt contract de coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`silver:merge:company\`` (~L2787–2807).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `silver:merge:company`; există `e1:ai:merge-xai` / `ai:merge:xai` (~L725–731); `e1:pipeline:promote-bronze-silver` / `pipeline:promote:bronze-silver` (~L917–918).
- `workers/shared/src/queue-registry.ts` — `PIPELINE_PROMOTE_BRONZE_SILVER`, `AI_MERGE_XAI` (~L65, ~L85).
- `workers/enrichment/src/main.ts` — `"ai:merge:xai"` (~L150), `"pipeline:promote:bronze-silver"` (~L172).
- `workers/enrichment/src/workers/promotion-bronze-silver.ts` — `mergeWithSource`, `promotionBronzeSilverProcessor` + `withCognitiveSpan("e1:pipeline:promote-bronze-silver", …)` (~L1795–1809, ~L2972–2977).
- `workers/enrichment/src/workers/j2-ai-data-merger.ts` — `withCognitiveSpan("e1:ai:merge-infraq", …)` (~L23–26).
- `rg` `silver:merge:company` în `*.ts`: **fără**.

## Instanțe v2

- **OTel (v2):** `cognitive.silver.merge.company`
- **Evidence status:** graph-export-grounded; reconciliere registry nefinalizată în v2.

## N/A pe criterii

- **Rând 8 (strict pentru v2_queue):** **N/A** — v2 clasifică acest neuron ca Non-AI. Apel LLM pentru fuziune există pe coada **`ai:merge:xai`**, nu pe literalul `silver:merge:company`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `silver:merge:company`. **Semnale:** `e1:pipeline:promote-bronze-silver`, `e1:ai:merge-infraq` (runtime J2) vs catalog `e1:ai:merge-xai`. | v2 canonic. | Migrare aliniere `nodeKey` J2 ↔ catalog. |
| 2 | Etapă, familie, swimlane | E1; promovare în worker enrichment; J2 în `ai-analysis` (catalog). | v2 merge / swimlane merge în metrică. | — |
| 3 | Rol declarat | Promovare: construire/actualizare rând `silverCompanies` din bronze+ANAF etc.; J2: reconciliere JSON multi-sursă cu `infraqStructuredJson`. | v2 merge generic. | — |
| 4 | NeuronType + SOFAI | v2: `AssociativeNeuron`. Promovare: logică asociativă deterministă. J2: `DeliberativeNeuron` în catalog (AI). | v2. | Tip diferit pe calea AI. |
| 5 | Criticitate | v2: `MEDIUM`. Catalog J2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | Span-uri `cognitive:e1:pipeline:promote-bronze-silver`, `cognitive:e1:ai:merge-infraq`. **Fără** `cognitive.silver.merge.company`. | ADR-0003. | Nealinat literal v2. |
| 7 | Înveliș politică | J2: HITL sub `confidence < 0.7` cu conflicte (~L59–78). Promovare: fără Cedar citit în eșantion. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** pentru `v2_queue` (v2 Non-AI). **Semnal:** `infraqStructuredJson` + `INFRAQ_REASONING_MODEL` în J2 (~L4–5, ~L50). | v2 Non-AI pentru acest antet. | LLM pe altă coadă. |
| 9 | Guardrails | J2: prag încredere + task HITL; promovare: reguli sursă câmp. | ADR-0007. | — |
| 10 | Escaladare HITL | J2: `createHitlApprovalTask` tip `ai_merge_review` (~L65–77). | ADR-0008. | — |
| 11 | Micro-OODA | Promovare: citire multi-sursă → decizie câmp; J2: observare surse → decizie LLM → act DB/HITL. | v2 OODA merge. | Mapare parțială pe două cozi. |
| 12 | Tier + de-escaladare | J2: de-escaladare prin HITL sub prag; promovare: fără prag LLM. | v2 §2.2. | — |
| 13 | Stack | BullMQ, Postgres silver/bronze, InfraQ (J2), worker enrichment. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.silver.merge.company`.
- **Cod:** span-uri pe `e1:pipeline:promote-bronze-silver` și `e1:ai:merge-infraq`; **lipsă** span dedicat pentru `v2_queue`.
- **Stare:** **gap** canonic; **drift** `e1:ai:merge-infraq` vs catalog `e1:ai:merge-xai`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
