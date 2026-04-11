<!-- neuron-contract:author-complete -->

# Neuron `enrich:phone:hlr-lookup`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:phone:hlr-lookup` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--phone--hlr-lookup.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** canonează `enrich:phone:hlr-lookup`. **Runtime:** coada **`enrich:phone:hlr`** (`ENRICH_PHONE_HLR`), procesor `hlrLookupProcessor` în `h2-hlr-lookup.ts`, care apelează `hlrLookup` din `hlr-api-client.ts` (HTTP către `HLR_API_URL` cu `HLR_API_KEY`, timeout configurabil). Răspunsul (status, reachable, carrier, `carrier_type`, mcc_mnc, etc.) este salvat în `metadata.hlrLookup` pe entitatea silver (companie sau contact) și logat în `silverEnrichmentLog` (`source: "hlr_lookup"`). După normalizare, `h1-phone-normalizer.ts` enfilează `enrich:phone:hlr` (job `hlr-lookup`). **Diferență lexicală:** v2 `hlr-lookup` vs cod `hlr` (fără sufixul `-lookup`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:phone:hlr-lookup\`` (~L2325–2345).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:phone-hlr` / `enrich:phone:hlr` (~L657–665).
- `workers/shared/src/queue-registry.ts` — `ENRICH_PHONE_HLR` (~L58).
- `workers/enrichment/src/main.ts` — `enrich:phone:hlr` → `hlrLookupProcessor` (~L143).
- `workers/enrichment/src/workers/h2-hlr-lookup.ts` — `withCognitiveSpan("e1:enrich:phone-hlr", …)` (~L27–29); apel `hlrLookup` (~L57); patch metadata (~L63–93).
- `workers/enrichment/src/lib/hlr-api-client.ts` — `HLR_API_URL`, `HLR_API_KEY`, `callExternalApi` (~L1–50+).
- `workers/enrichment/src/workers/h1-phone-normalizer.ts` — enqueue HLR (~L97–106).

## Instanțe v2

- **OTel v2:** `cognitive.enrich.phone.hlr-lookup`.
- **OTel cod:** `e1:enrich:phone-hlr`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e1:enrich:phone-hlr` ↔ `enrich:phone:hlr`. v2: `enrich:phone:hlr-lookup`. | v2 canonic cu sufix `-lookup`. | Denumire coadă diferită. |
| 2 | Etapă, familie, swimlane | E1; catalog `enrichment-external` (~L661–662). | v2 enrichment. | — |
| 3 | Rol declarat | Validare/lookup HLR prin serviciu extern; persistare rezultat structurat în metadata. | v2 ToolNeuron enrichment. | — |
| 4 | NeuronType + SOFAI | Catalog: `ToolNeuron` (~L660). | v2 `ToolNeuron`. | — |
| 5 | Criticitate | Catalog: `MEDIUM` (~L664). v2: `MEDIUM`. | Aliniat. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e1:enrich:phone-hlr", …)`. | v2 `cognitive.enrich.phone.hlr-lookup`. | Span v2 ≠ `nodeKey`. |
| 7 | Înveliș politică | `callExternalApi` + variabile mediu; fără HITL în handler. | v2 tier 4. | Detalii furnizor HLR în afara scope-ului fișierelor citate. |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Eșec dacă lipsesc URL/cheie HLR (`hlr-api-client.ts`). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără în `h2-hlr-lookup.ts`. | ADR-0008. | — |
| 11 | Micro-OODA | Apel extern → interpretare răspuns → scriere DB + log. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Fără praguri încredere explicite în codul citat. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP HLR, Postgres silver. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.phone.hlr-lookup`.
- **Cod:** `e1:enrich:phone-hlr`.
- **Stare:** **nealinat** literal span v2 vs `nodeKey`; funcționalitatea HLR este implementată sub alt `queueName`.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
