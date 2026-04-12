<!-- neuron-contract:author-complete -->

# Neuron `q:wa:phone_`

> **Status:** audit manual **2026-04-11**. Numele v2 **`q:wa:phone_`** (underscore final, din export graf) **nu** există ca literal Redis în runtime. Trimiterea WA inițială folosește pattern-ul **`q:wa:phone-NN`** cu **cratimă** și zero-padding (`getWaPhoneQueueName`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:wa:phone_` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/q--wa--phone_.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2:** familie de neuroni motori pentru WA per linie. **Repo:** nu există coadă `q:wa:phone_`; `createWaWorker` (`workers/outreach/src/workers/whatsapp.ts`, L106–290) este înregistrat pentru **`getWaPhoneQueueName(i)`** → `q:wa:phone-${String(i).padStart(2,"0")}` (`workers/shared/src/queue-registry.ts`, L658–663), `i ∈ [1, WA_PHONE_COUNT]`, `WA_PHONE_COUNT = 20`. Catalog: `CATALOG_STATS.skippedQueues` — pattern `q:wa:phone-{01..20}` (`packages/shared/src/cognitive-node-catalog.ts`, L3381–3393). Acest contract tratează antetul v2 ca **etichetă de familie /șablon**, nu ca nume de coadă concretă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:wa:phone_\`` (L4133–4153).
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker`, `createAllWaWorkers`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`, `WA_PHONE_COUNT`, comentariu L10 despre underscore în nume.
- `packages/shared/src/cognitive-node-catalog.ts` — `skippedQueues` pattern.
- `workers/outreach/src/index.ts` — L150–152, înregistrare `createAllWaWorkers`.

## Instanțe v2

- **Divergență nume:** v2 `q:wa:phone_` vs runtime `q:wa:phone-01` … `q:wa:phone-20` (separator și padding).

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în `createWaWorker`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `nodeKey` pentru literalul v2; familia este acoperită prin pattern catalog `q:wa:phone-{01..20}`. | v2 `q:wa:phone_`. | Cutover denumiri v2 ↔ runtime. |
| 2 | Etapă, familie, swimlane | Logger `etapa: e2` în `whatsapp.ts` L38; swimlane v2 `whatsapp`. | v2 E2 whatsapp. | — |
| 3 | Rol declarat | Trimitere outbound WA (cuota, jitter, provider). | v2 operational purpose. | — |
| 4 | NeuronType + SOFAI | Comportament aliniat **MotorNeuron** (acțiune externă). | v2 MotorNeuron. | Fără intrare catalog pe acest șir exact. |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | `createWorker(queueName, …)` per coadă dinamică (`factory` + rezolvare `nodeKey`). | v2 `cognitive.q.wa.phone_`. | Span v2 ≠ nume cozi reale. |
| 7 | Înveliș politică | Quota Lua, telefon ACTIVE, concurrency 1. | v2 tier 4, fără HITL obligatoriu. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | `quotaGuardianCheck`, status `ACTIVE`, ADR-0057 jitter, ADR-0060 concurrency. | v2 + ADR. | — |
| 10 | Escaladare HITL | Nu în acest worker. | v2 «No mandatory HITL». | — |
| 11 | Micro-OODA | OBSERVE: job + Redis/PG; ORIENT: quota + telefon; DECIDE: trimite/sari; ACT: TimelinesAI + log. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Răspuns structurat `retryable` pentru erori deterministe. | v2 Tier 4. | — |
| 13 | Stack | BullMQ, Redis Lua, Postgres, `@cerniq/integrations` (TimelinesAI), metrici `waSent`. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.q.wa.phone_`.
- **Cod:** `withCognitiveSpan` / atribute `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.etapa`, etc. — mapare **conceptuală** până la unificare `v2_queue` cu `q:wa:phone-NN`.

---
*Generator inițial:* înlocuit prin audit manual.
