<!-- neuron-contract:author-complete -->

# Neuron `enrich:phone:carrier-detect`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:phone:carrier-detect` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--phone--carrier-detect.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** canonează `enrich:phone:carrier-detect` (ToolNeuron, Non-AI). **În runtime**, coada înregistrată este **`enrich:phone:carrier`** (`queue-registry.ts` → `ENRICH_PHONE_CARRIER`), procesată de `carrierDetectionProcessor` în `h3-carrier-detection.ts`. Logica este **euristică pe prefixe naționale** (`ROMANIAN_PREFIXES` — 3–4 cifre după normalizare `+40`/`40` → `0`), **fără** apel HTTP către un furnizor extern în acest fișier. Rezultatul se scrie în `metadata.carrierDetection` pe `silverCompanies` sau `silverContacts` și se loghează în `silverEnrichmentLog` cu `source: "carrier_detection"`. După normalizare telefon, `h1-phone-normalizer.ts` enfilează explicit `enrich:phone:carrier` (job `carrier-detect`). **Divergență față de textul generic v2:** micro-OODA menționează «API call vs cache» — implementarea efectivă este deterministă locală, nu integrare API.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:phone:carrier-detect\`` (~L2303–2323).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:phone-carrier` / `enrich:phone:carrier` (~L666–674).
- `workers/shared/src/queue-registry.ts` — `ENRICH_PHONE_CARRIER` (~L59).
- `workers/enrichment/src/main.ts` — mapare `enrich:phone:carrier` → `carrierDetectionProcessor` (~L144).
- `workers/enrichment/src/workers/h3-carrier-detection.ts` — `withCognitiveSpan("e1:enrich:phone-carrier", …)` (~L50–52); `detectCarrier` / `ROMANIAN_PREFIXES` (~L25–48); persistare metadata (~L90–106).
- `workers/enrichment/src/workers/h1-phone-normalizer.ts` — `createQueue("enrich:phone:carrier")` + `add("carrier-detect", …)` (~L112–121).
- `workers/enrichment/src/workers/sprint3.integration.test.ts` — import `carrierDetectionProcessor` (~L348).

## Instanțe v2

- **Coadă v2:** `enrich:phone:carrier-detect`.
- **Coadă runtime:** `enrich:phone:carrier` — **nume diferit** față de v2.
- **OTel span (v2):** `cognitive.enrich.phone.carrier-detect`.
- **OTel în cod:** `e1:enrich:phone-carrier`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; fără rutare LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog: `e1:enrich:phone-carrier` pentru `enrich:phone:carrier`. **v2_queue** diferit (`carrier-detect`). | v2 canonic `enrich:phone:carrier-detect`. | Migrare denumiri = fază 2 (plan). |
| 2 | Etapă, familie, swimlane | E1; catalog swimlane `enrichment-external` pentru acest nod (~L671–672). | v2 familie enrichment. | — |
| 3 | Rol declarat | Cod: identificare operator + tip linie (MOBILE/FIXED) din prefixe RO. | v2 analogie cortex premotor / enrichment generic. | — |
| 4 | NeuronType + SOFAI | Catalog: `ToolNeuron` (~L670). | v2 `ToolNeuron`. | — |
| 5 | Criticitate | Catalog: `LOW` (~L673). v2: `MEDIUM`. | v2 vs catalog. | **Divergență** explicită. |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:enrich:phone-carrier", …)` (`h3-carrier-detection.ts`). | v2 span `cognitive.enrich.phone.carrier-detect`. | Nume span v2 ≠ `nodeKey`. |
| 7 | Înveliș politică | Fără Cedar/OPA în handler; `setSessionTenantId`; erori propagate. | v2 tier 4; ADR-0007. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Doar normalizare numerică + mapare prefix; fără NeMo. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără enqueue `human:*` în `h3-carrier-detection.ts`. | ADR-0008. | — |
| 11 | Micro-OODA | Cod: observare număr → decizie prefix → act (DB); **fără** strat «API vs cache» ca în textul generic v2. | v2 OODA (generic). | v2 OODA nu reflectă implementarea fără API. |
| 12 | Tier + de-escaladare | Fără praguri încredere în cod. | v2 §2.2. | — |
| 13 | Stack | BullMQ, Postgres (`silver_*`, `silver_enrichment_log`). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.phone.carrier-detect`.
- **Cod:** `cognitive.nodeKey` = `e1:enrich:phone-carrier` (`withCognitiveSpan`).
- **Stare:** **nealinat** nume span v2 ↔ `nodeKey`; coadă v2 ↔ `queueName` runtime.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
