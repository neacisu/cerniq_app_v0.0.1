<!-- neuron-contract:author-complete -->

# Neuron `silver:merge:contact`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `silver:merge:contact` |
| etapa | E1 |
| familie (v2, prima instanță) | `merge` |
| contract_path | `contracts/neurons/E1/silver--merge--contact.md` |
| ADR familie (indicativ) | [merge](../../adr/families/e1/merge.md) |

## Scop în context real

**v2** descrie **`silver:merge:contact`** ca AssociativeNeuron pentru corelare/integrare contacte silver. **Nu** există coadă BullMQ sau `nodeKey` cu acest nume. **În repo**, comportamentul cel mai apropiat este **upsert-ul de contact primar** în fluxul **`pipeline:promote:bronze-silver`**: funcția `upsertPromotionPrimaryContact` inserează sau actualizează `silverContacts` cu `onConflictDoUpdate` și `COALESCE` pe `prenume`, `nume`, `telefon` (`promotion-bronze-silver.ts`). **Fuziunea AI multi-sursă din J2** este orientată pe **companie** (`entityId` company), nu pe un contract dedicat «merge contact» v2. **Concluzie:** v2_queue **gap**; singura cale citită cu merge-like pentru contact silver este **în promovare**.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`silver:merge:contact\`` (~L2809–2829).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `silver:merge:contact`.
- `workers/shared/src/queue-registry.ts` — **fără** literal `silver:merge:contact`; `PIPELINE_PROMOTE_BRONZE_SILVER` pentru promovare.
- `workers/enrichment/src/workers/promotion-bronze-silver.ts` — `upsertPromotionPrimaryContact`, insert `silverContacts` + `onConflictDoUpdate` (~L2325–2398); procesor `withCognitiveSpan("e1:pipeline:promote-bronze-silver", …)` (~L2972–2977).
- `workers/enrichment/src/workers/j2-ai-data-merger.ts` — `entityType: "company"` în logger (~L35–36); **nu** echivalent «merge contact» v2.
- `rg` `silver:merge:contact` în `*.ts`: **fără**.

## Instanțe v2

- **OTel (v2):** `cognitive.silver.merge.contact`
- **Evidence status:** graph-export-grounded; reconciliere registry nefinalizată în v2.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI pentru acest antet; fără apel LLM dedicat «merge contact» în cod citit.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 2 | Etapă, familie, swimlane | E1; promovare în enrichment worker. | v2 merge. | — |
| 3 | Rol declarat | Upsert contact primar din payload bronze + mapping; fuziune câmpuri prin COALESCE la conflict. | v2 merge contact. | Fără neuron izolat. |
| 4 | NeuronType + SOFAI | v2: `AssociativeNeuron`. Cod: logică în promovare (determinist). | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | Acoperit de span `cognitive:e1:pipeline:promote-bronze-silver` (același job ca promovarea companie). **Fără** `cognitive.silver.merge.contact`. | ADR-0003. | Nealinat literal v2. |
| 7 | Înveliș politică | Fără Cedar explicit în funcția citită; actualizare condiționată conflict. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare minimă contact (email/telefon/nume) înainte de upsert (~L2344–2346). | ADR-0007. | — |
| 10 | Escaladare HITL | **Fără** `createHitlApprovalTask` în `upsertPromotionPrimaryContact` la audit. | ADR-0008. | HITL pe alte ramuri promovare: în afara scope-ului citit. |
| 11 | Micro-OODA | Observare payload bronze → decizie insert vs update → act `silverContacts`. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag LLM; comportament tranzacțional SQL. | v2 §2.2. | — |
| 13 | Stack | BullMQ, Postgres `silverContacts`, Drizzle `onConflictDoUpdate`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.silver.merge.contact`.
- **Cod:** **lipsă** span dedicat; acoperire **indirectă** prin `cognitive:e1:pipeline:promote-bronze-silver`.
- **Stare:** **gap** canonic.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
