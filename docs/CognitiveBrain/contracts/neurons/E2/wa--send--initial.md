<!-- neuron-contract:author-complete -->

# Neuron `wa:send:initial`

> **Status:** audit manual **2026-04-11**. **Fără** coadă literală `wa:send:initial` în `queue-registry.ts`. Mesajele inițiale WA sunt procesate pe **`q:wa:phone-NN`** prin `createWaWorker(i, false, …)` (`whatsapp.ts` L112–114, L298–300).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `wa:send:initial` |
| etapa | E2 |
| familie (v2) | `whatsapp` |
| contract_path | `contracts/neurons/E2/wa--send--initial.md` |
| ADR familie (indicativ) | [whatsapp](../../adr/families/e2/whatsapp.md) |

## Scop în context real

**v2:** antet graf pentru primul mesaj WA. **Repo:** `getWaPhoneQueueName(phoneIndex)` produce **`q:wa:phone-01`** … **`q:wa:phone-20`**; worker-ul folosește `isFollowup: false` în factory, iar în handler `isNewContact: !jobIsFollowup` pentru quota (`whatsapp.ts` L131–138). Tranziție journey `CONTACTED_WA` doar pentru non-followup (L241–270). **Producători:** orchestrare (`orchestration.ts` L532), API outreach (`apps/api/src/routes/outreach.ts` L575–576 când nu e follow-up). **Notă plan:** există și instanță **E5** `wa:send:initial — duplicat #2` (fișier separat sub `E5/`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`wa:send:initial\`` (L4365–4385).
- `workers/outreach/src/workers/whatsapp.ts` — `createWaWorker`, `WaSendInitialJobData`.
- `workers/shared/src/queue-registry.ts` — `getWaPhoneQueueName`.
- `workers/outreach/src/workers/orchestration.ts` — trimitere către coadă inițială.
- `apps/api/src/routes/outreach.ts` — selecție coadă.

## Instanțe v2

- **E2 (acest fișier):** conceptual `wa:send:initial` → cozi **`q:wa:phone-NN`**.
- **E5 duplicat #2:** vezi `contracts/neurons/E5/wa--send--initial.md` (todo separat).

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în sender.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** catalog pentru literalul v2; pattern `q:wa:phone-{01..20}`. | v2 `wa:send:initial`. | — |
| 2 | Etapă, familie, swimlane | E2 whatsapp. | v2. | — |
| 3 | Rol declarat | Primul mesaj WA outbound per flux coadă per-telefon. | v2. | — |
| 4 | NeuronType + SOFAI | MotorNeuron. | v2 MotorNeuron. | — |
| 5 | Criticitate | — | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | Span pe `q:wa:phone-NN`. | v2 `cognitive.wa.send.initial`. | — |
| 7 | Înveliș politică | Quota consum pentru contact nou, jitter, concurrency 1. | v2 Tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 Non-AI. | N/A |
| 9 | Guardrails | Quota Lua, telefon ACTIVE, ADR-0057/0060. | ADR. | — |
| 10 | Escaladare HITL | Nu în sender. | v2. | — |
| 11 | Micro-OODA | OBSERVE–ACT ca în `createWaWorker` cu ramură journey. | v2. | — |
| 12 | Tier + de-escaladare | Erori `retryable` false pentru blocaje quota/telefon. | v2. | — |
| 13 | Stack | BullMQ, Redis, PG, TimelinesAI. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.wa.send.initial`.
- **Cod:** **`cognitive.nodeKey`** rezolvat din coada reală — mapare **parțială / conceptuală** față de numele v2.

---
*Generator inițial:* înlocuit prin audit manual.
