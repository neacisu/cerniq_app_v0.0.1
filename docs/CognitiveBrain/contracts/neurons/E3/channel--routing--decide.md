<!-- neuron-contract:author-complete -->

# Neuron `channel:routing:decide`

> **Status:** audit manual **2026-04-11**. **Contractul v2** folosește coada `channel:routing:decide`; **runtime-ul** implementează **`channel:route:decide`** (J58) cu `nodeKey` **`e3:channel:route-decide`** — aceeași funcție de rutare canale, **denumire diferită** (vezi ADR familie channels).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `channel:routing:decide` |
| etapa | E3 |
| familie (v2) | `channels` |
| contract_path | `contracts/neurons/E3/channel--routing--decide.md` |
| ADR familie (indicativ) | [channels](../../adr/families/e3/channels.md) |
| **coadă runtime (dovadă)** | `channel:route:decide` |

## Scop în context real

**v2** (L4747–4767) descrie neuron **channels**, câmp confirmat **`channel:routing:decide`**, tip **MotorNeuron** *inferat*, criticitate **MEDIUM**, **Non-AI**, status evidență: export graf ne-reconciliat cu registry (L4767). **Repo:** `workers/e3-ai-sales/src/workers/j58-channel-route-decide.ts` — **decizie deterministă** canal handover: WA (cu blackout 21:00–08:00 Europe/Bucharest), EMAIL, PHONE (critic + high-value), sau **HITL** dacă lipsesc date contact. După decizie: enqueue **`channel:whatsapp:send`**, **`channel:email:send`**, sau **`hitl:escalation`** (`j58` L212–274). **Upstream:** `handover:context:load` (J57) enfilează J58 (`j57-handover-context-load.ts` L11, L41). **Înregistrare:** `main.ts` L244. **Registry:** `QUEUES.E3_CHANNEL_ROUTE_DECIDE` → literal **`channel:route:decide`** (`queue-registry.ts` L312, L1012). **Catalog:** `e3:channel:route-decide` — **ExecutiveNeuron**, criticitate **HIGH** (`cognitive-node-catalog.ts` L2030–2037). **Teste:** `j-workers.test.ts` J58 (L481+). Nu s-au găsit producători în `apps/api` pentru această coadă la audit.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`channel:routing:decide\`` (L4747–4767).
- `docs/CognitiveBrain/adr/families/e3/channels.md` — graf `channel:routing:decide` vs runtime `channel:route:decide`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e3:channel:route-decide` (L2030–2037); **fără** intrare pentru string-ul literal `channel:routing:decide`.
- `workers/shared/src/queue-registry.ts` — `E3_CHANNEL_ROUTE_DECIDE` (L312, L1012).
- `workers/e3-ai-sales/src/main.ts` — L244.
- `workers/e3-ai-sales/src/workers/j58-channel-route-decide.ts` — procesor + `resolveChannel` (L120–169).
- `workers/e3-ai-sales/src/workers/j57-handover-context-load.ts` — enqueue J58 (L41, L11).
- `workers/e3-ai-sales/src/__tests__/j-workers.test.ts` — J58 (L481+).
- `workers/shared/src/factory.ts` — instrumentare cognitivă.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4763); J58 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Runtime:** `e3:channel:route-decide` ↔ **`channel:route:decide`** (`cognitive-node-catalog.ts` L2030–2031). **v2 contract:** `channel:routing:decide` (L4761) — **fără** aceeași cheie în registry/catalog. | v2: `Confirmed queue field` = `channel:routing:decide`. | **Divergență denumire coadă** — migrare documentată în ADR/plan fază 2. |
| 2 | Etapă, familie, swimlane | E3; swimlane catalog **`ai-reasoning`** (`cognitive-node-catalog.ts` L2034). | v2: swimlane `channels` în metrici (L4765) — **decalaj** față de catalog (`ai-reasoning`). | v2 L4765 vs catalog L2034. |
| 3 | Rol declarat | Rutare handover WA/EMAIL/PHONE/HITL + enqueue cozi (`j58` L1–16, L212–274). | v2: descriere generică E3 channels (L4758–4760). | Funcția reală îngustă: flux handover negociere. |
| 4 | NeuronType + SOFAI | **`ExecutiveNeuron`** (`cognitive-node-catalog.ts` L2033). | v2: **MotorNeuron** inferat (L4754). | **Decalaj tip:** inferență v2 vs catalog explicit. |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L2036). | v2: **MEDIUM** inferat (L4756). | **Decalaj criticitate.** |
| 6 | Înveliș telemetrie | `withCognitiveSpan` via factory worker. | v2: `cognitive.channel.routing.decide` (L4766) — fără prefix `e3` în nume. | **Parțial aliniat:** convenții span diferite; cod `cognitive.nodeKey`. |
| 7 | Înveliș politică | Logică deterministă + HITL queue la `HITL`/`PHONE` (`j58` L242–274); fără Cedar. | v2: Tier 4, fără HITL obligatoriu (L4757, L4764). | PHONE log + HITL — mai strict decât „no mandatory HITL” pentru unele ramuri. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | E.164 WA, blackout, prag RON 50k (`j58` L30, L33, L56–60, L189–206); preferințe `preferredChannel`. | ADR-0007 — destinație documentată. | — |
| 10 | Escaladare HITL | `QUEUES.HITL_ESCALATION` pentru `PHONE` și `HITL` (`j58` L66, L248–274). | ADR-0008; v2 „no mandatory HITL” (L4764). | Implementare concretă de escaladare la lipsă contact / telefon. |
| 11 | Micro-OODA | OBSERVE — context handover; ORIENT — blackout, contact, valoare; DECIDE — `resolveChannel`; ACT — `add` job pe cozi (`j58` L177–277). | v2 OODA generic (L4762). | Aliniat; „quotas” v2 nu apar ca Redis explicit — delegare la cozi downstream. |
| 12 | Tier + de-escaladare | Fără scor încredere în J58. | v2 Tier 4 (L4757). | — |
| 13 | Stack (subset) | BullMQ, `createQueue`, Intl timezone Europe/Bucharest. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.channel.routing.decide` (L4766).
- **Cod:** `cognitive.nodeKey` **`e3:channel:route-decide`** pentru coada **`channel:route:decide`** — **parțial aliniat**; numele v2 nu include `e3` și nu coincide cu `nodeKey`.

---
*Generator inițial:* înlocuit prin audit manual.
