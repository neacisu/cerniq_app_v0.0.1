<!-- neuron-contract:author-complete -->

# Neuron `negotiation:expire:check`

> **Status:** audit manual **2026-04-11**. **D23** selectează negocieri cu TTL per stare (`PROPOSAL` 7z, `NEGOTIATION` 30z, `CLOSING` 14z, `PROFORMA_SENT` 30z) și enfilează **`negotiation:abandon:process`** (D26), nu setează direct `EXPIRED` în acest fișier.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `negotiation:expire:check` |
| etapa | E3 |
| familie (v2) | `negotiation` |
| contract_path | `contracts/neurons/E3/negotiation--expire--check.md` |
| ADR familie (indicativ) | [negotiation](../../adr/families/e3/negotiation.md) (dacă există) |

## Scop în context real

**v2** (L5207–5230): **AttentionNeuron**, **HIGH**, detectare expirare și «tranziție automată la EXPIRED» (L5221–5222). **Repo:** `d23-negotiation-expire-check.ts` — SQL TTL (`d23` L41–55), pentru fiecare rând `abandonQueue.add("negotiation:abandon:process", …)` (`d23` L63–75). Comentariu antet CRON `0 * * * *` (`d23` L4–6). **Înregistrare:** `main.ts` L200. **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK` (`queue-registry.ts` L240). **Teste:** `d-workers.test.ts` D23 (L759+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L5207–5230.
- `packages/shared/src/cognitive-node-catalog.ts` — L1702–1709.
- `workers/shared/src/queue-registry.ts` — L240.
- `workers/e3-ai-sales/src/main.ts` — L200.
- `workers/e3-ai-sales/src/workers/d23-negotiation-expire-check.ts`.
- `workers/e3-ai-sales/src/__tests__/d-workers.test.ts` — D23.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5226).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:negotiation:expire-check`**, **`negotiation:expire:check`** (`cognitive-node-catalog.ts` L1703–1704). | v2 (L5224). | — |
| 2 | Etapă, familie, swimlane | E3; **`negotiation-fsm`** (`cognitive-node-catalog.ts` L1707). | v2 (L5210–5217). | — |
| 3 | Rol declarat | Detectare TTL + coadă abandon (`d23` L4–6, L33–75). | v2 EXPIRED direct (L5221–5222). | **Divergență:** fluxul trece prin **abandon:process** (D26), nu prin update direct `EXPIRED` în D23. |
| 4 | NeuronType + SOFAI | **`AttentionNeuron`** (`cognitive-node-catalog.ts` L1706). | v2 (L5215). | — |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1709). | v2 (L5218). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.negotiation.expire-check` (L5229). | **Parțial aliniat**. |
| 7 | Înveliș politică | Filtru SQL explicit + tenant opțional (`d23` L29–31, L54). | v2 Tier 3 (L5219). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Exclude rânduri fără TTL match; fără NeMo. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în D23. | v2 (L5227). | — |
| 11 | Micro-OODA | OBSERVE — DB; ORIENT — TTL; ACT — enqueue abandon (`d23` L33–79). | v2 poll/alert (L5225). | OODA v2 generic; implementare = scan SQL + jobs. |
| 12 | Tier + de-escaladare | Fără în D23. | v2 Tier 3 (L5219). | — |
| 13 | Stack (subset) | BullMQ, Drizzle `sql`. | v2 §2.3. | Producer CRON: antet D23 — `queue.add` repeat în afara fișierului = limită evidență. |

### Mapare OTel

- **v2:** `cognitive.e3.negotiation.expire-check`.
- **Cod:** `cognitive.nodeKey` **`e3:negotiation:expire-check`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
