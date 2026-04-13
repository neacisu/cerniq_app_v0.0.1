<!-- neuron-contract:author-complete -->

# Neuron `content:drip:send`

> **Status:** audit manual **2026-04-13**. **v2** (L7832–L7852): coadă `content:drip:send`, familia `content`, E5. **Repo:** coada canonică este **`content:drip:execute`** — `E5_CONTENT_DRIP_EXECUTE` în `queue-registry.ts` (L618), catalog `e5:content:drip-execute` (`cognitive-node-catalog.ts` L3208–L3215), worker **I49** `i49-content-drip-execute.ts`, `withCognitiveSpan("e5:content:drip-execute", …)` (L57). **ADR:** `content.md` notează explicit divergența `content:drip:send` (graf) vs `content:drip:execute` (registry).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `content:drip:send` |
| coadă runtime | `content:drip:execute` |
| etapa | E5 |
| familie (v2) | `content` |
| contract_path | `contracts/neurons/E5/content--drip--send.md` |
| ADR familie (indicativ) | [content](../../adr/families/e5/content.md) |

## Scop în context real

Execuția pasului drip (trimite canal conform acțiunii planificate); produs de I48; vezi `i49-content-drip-execute.ts`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7832–L7852.
- `docs/CognitiveBrain/adr/families/e5/content.md` — mapare `drip:send` vs `drip:execute`.
- `workers/shared/src/queue-registry.ts` — `E5_CONTENT_DRIP_EXECUTE` (L618).
- `packages/shared/src/cognitive-node-catalog.ts` — `e5:content:drip-execute` (L3208–L3215).
- `workers/e5-nurturing/src/workers/i49-content-drip-execute.ts` — procesor (L4–5, L57).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7832–L7852:** `ProceduralNeuron`, câmp `content:drip:send`, span `cognitive.content.drip.send` (L7851).

## N/A pe criterii

- **8 — Rutare model:** N/A — non-AI în v2 (L7847).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`content:drip:execute`** + `e5:content:drip-execute`; **fără** `content:drip:send` literal în registry. | v2: `content:drip:send` (L7846). | Denumire graf vs registry. |
| 2 | Etapă, familie, swimlane | Catalog: `content-drip`, etapă 5 (L3213–L3214). | v2: E5, `content` (L7835–L7836). | — |
| 3 | Rol declarat | „Execuție drip I49 — trimitere email/SMS/push…” (catalog L3211). | v2: execuție procedurală (L7839–L7841). | — |
| 4 | NeuronType + SOFAI | `MotorNeuron` (catalog L3212). | v2: `ProceduralNeuron` (L7839). | Neconcordanță tip între v2 și catalog. |
| 5 | Criticitate | Catalog: `MEDIUM` (L3214). | v2: `MEDIUM` (L7843). | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e5:content:drip-execute", …)` (`i49` L57). | v2 span `cognitive.content.drip.send` (L7851). | Nume diferit (`execute` vs `send`). |
| 7 | Înveliș politică | Concurrency 10 în antet I49 (`i49` L4). | v2 Tier 4, fără HITL obligatoriu (L7844–L7848). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 L7847. | — |
| 9 | Guardrails | Validare payload job + stări acțiuni (I49). | v2 L7848. | — |
| 10 | Escaladare HITL | Posibil prin eșec livrare / alte cozi; nu în I49 minimal. | v2 L7848. | — |
| 11 | Micro-OODA | Consum job → acțiune canal → actualizări DB. | v2 OODA (L7845). | — |
| 12 | Tier + de-escaladare | Retry BullMQ. | v2 Tier 4 (L7844). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E5, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.content.drip.send`.
- **Cod:** `cognitive:e5:content:drip-execute`.

---
*Audit manual 2026-04-13.*
