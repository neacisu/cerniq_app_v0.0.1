<!-- neuron-contract:author-complete -->

# Neuron `q:wa:phone_XX`

> **Status:** audit manual **2026-04-11**. **`XX`** din v2 este **placeholder** pentru orice index `01..20`. În runtime: **`q:wa:phone-${String(i).padStart(2,"0")}`** și perechea **`:followup`** pentru același index (`getWaPhoneFollowupQueueName`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:phone_XX` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--phone_xx.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2:** reprezentare generică a cozilor per-telefon. **Repo:** `createAllWaWorkers` instanțiază **40** workeri: pentru fiecare `i` din `1..20`, un worker pe **`q:wa:phone-NN`** (inițial) și unul pe **`q:wa:phone-NN:followup`** (`whatsapp.ts` L296–301, `queue-registry.ts` L666–676). Contractele dedicate `q:wa:phone_01` … `_20` detaliează instanțe; acest fișier rezumă **pattern-ul** și legătura cu catalog `skippedQueues`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:phone_XX\`` (L4221–4241).
- `workers/outreach/src/workers/whatsapp.ts` — `createAllWaWorkers`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`, `getWaPhoneFollowupQueueName`, `buildWaPhoneQueues`.
- `packages/shared/src/cognitive-node-catalog.ts` — pattern-uri `q:wa:phone-{01..20}`.

## Instanțe v2

- **Semantica XX:** orice index valid = rând separat în matrice (`q:wa:phone_01` … `_20`) + cozi `:followup` (vezi `wa:send:followup`).

## N/A pe criterii

- **Rând 8:** **N/A** la nivel de pattern (sender fără LLM).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Catalog documentează **pattern**, nu un singur `nodeKey` pentru „XX”. | v2 `q:wa:phone_XX`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp. | v2. | — |
| 3 | Rol declarat | Familie de cozi motor pentru WA multi-linie. | v2. | — |
| 4 | NeuronType + SOFAI | MotorNeuron per instanță. | v2. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Multe span-uri (câte o coadă). | v2 `cognitive.q.wa.phone_XX`. | Span v2 singular vs multe cozi. |
| 7 | Înveliș politică | ADR-0060: concurrency 1 / coadă. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI (sender). | N/A |
| 9 | Guardrails | Quota + telefon + jitter comune. | ADR. | — |
| 10 | Escaladare HITL | Nu la nivel sender. | v2. | — |
| 11 | Micro-OODA | Repetat per index. | v2. | — |
| 12 | Tier + de-escaladare | Politici identice pe toate indexurile. | v2. | — |
| 13 | Stack | Același stack WA pentru toate XX. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.q.wa.phone_XX`.
- **Cod:** telemetrie per **`q:wa:phone-NN`**; mapare agregată „XX” = **țintă documentară**, implementare = N instanțe.

---
*Generator inițial:* înlocuit prin audit manual.
