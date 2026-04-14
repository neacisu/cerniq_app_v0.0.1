<!-- neuron-contract:author-complete -->

# Neuron `credit:data:fetch-dosare`

> **Status:** audit manual **2026-04-13**. **v2** `credit:data:fetch-dosare` nu are coadă dedicată. **Runtime:** dosare instanță + litigii sunt încărcate prin **`credit:data:fetch-bpi`** (C16) — același apel Termene returnează câmpuri `dosare_parat_*` și proceduri insolvență (`c16` antet L7–13).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `credit:data:fetch-dosare` |
| etapa | E4 |
| familie (v2) | `credit` |
| contract_path | `contracts/neurons/E4/credit--data--fetch-dosare.md` |
| ADR familie (indicativ) | [credit](../../adr/families/e4/credit.md) |

## Scop în context real

**v2** (L6694–6714): neuron graph pentru date dosare. **Cod:** `creditDataFetchBpiProcessor` + `getTermeneDosare` / `parseDosare` — o singură integrare acoperă dosare și BPI (`c16-credit-data-fetch-bpi.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`credit:data:fetch-dosare\`` (L6694–6714).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:credit:data-fetch-bpi` / `credit:data:fetch-bpi` (L2375–2383); descriere include dosare instanță (L2378).
- `workers/shared/src/queue-registry.ts` — `E4_CREDIT_DATA_FETCH_BPI` (L389).
- `workers/e4-postsale/src/index.ts` — C16 (L258–263).
- `workers/e4-postsale/src/workers/c16-credit-data-fetch-bpi.ts`.
- `workers/e4-postsale/src/__tests__/c-workers.test.ts` — `C16 — creditDataFetchBpiProcessor`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6710).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** `credit:data:fetch-dosare` în registry. Implementare: **`credit:data:fetch-bpi`**, `e4:credit:data-fetch-bpi` (L2376–2377). | v2 coadă L6708. | Nume v2 ≠ coadă runtime; mapare semantică la C16. |
| 2 | Etapă, familie, swimlane | `CreditNeuron`, `credit-decision` (L2379–2380). | v2 L6697–6703. | — |
| 3 | Rol declarat | Dosare + proceduri insolvență într-un singur fetch (c16 L2–13). | v2 descriere generică (L6705–6707). | Granularitate v2 (dosar separat) ≠ cozi separate în cod. |
| 4 | NeuronType + SOFAI | `CreditNeuron` (L2371). | v2 `CreditNeuron` inferat (L6701). | — |
| 5 | Criticitate | `HIGH` (L2382). | `HIGH` v2 (L6703). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:credit:data:fetch-bpi", …)` (c16 L54–55). | v2 `cognitive.credit.data.fetch-dosare` (L6713). | OTel v2 nu reflectă numele cozii BPI. |
| 7 | Înveliș politică | — | v2 L6711. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | `sanitizeCui`, client Termene (c16). | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L6711. | — |
| 11 | Micro-OODA | Child paralel C13 → input C17. | v2 L6709. | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6704). | — |
| 13 | Stack v2 §2.3 (subset) | `termene-client.ts`, BullMQ Flow. | — | — |

### Mapare OTel

- **v2:** `cognitive.credit.data.fetch-dosare`.
- **Cod:** span `cognitive:e4:credit:data:fetch-bpi` (procesor C16); catalog `e4:credit:data-fetch-bpi`.
- **Stare:** **capabilitate v2 mapată la C16**; **fără** neuron/queue atomic `fetch-dosare`.

---
*Generator inițial:* înlocuit prin audit manual.
