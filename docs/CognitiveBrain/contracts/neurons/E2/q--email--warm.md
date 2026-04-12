<!-- neuron-contract:author-complete -->

# Neuron `q:email:warm`

> **Status:** audit manual **2026-04-11**. Canal **warm** = Resend tranzacțional; gardă ADR-0059 pe stări lead.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:email:warm` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/q--email--warm.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `MotorNeuron`, `e2:email:warm-send`, trimitere email warm personalizat via Resend. **Repo:** `createEmailWarmSenderWorker` în `workers/outreach/src/workers/email.ts` (L476–549) pe `QUEUES.EMAIL_WARM` (`q:email:warm`): verifică `currentState` ∈ `WARM_REPLY` | `NEGOTIATION`, apelează `createResendTransactionalEmailProvider().sendTransactional({ to, subject, html, tags })`, inserează rând `communicationLog` cu `EMAIL_WARM`, incrementează `outreachMessagesSentTotal` pentru `EMAIL_WARM`, `quotaCost: 0` la insert.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:email:warm\`` (L3295–3318).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:warm-send` / `q:email:warm`.
- `workers/shared/src/queue-registry.ts` — `EMAIL_WARM: "q:email:warm"` (L129), concurrency (L800).
- `workers/outreach/src/workers/email.ts` — `createEmailWarmSenderWorker`, `WARM_EMAIL_ALLOWED_STATES` (L36–39, L476–549).
- `workers/outreach/src/index.ts` — înregistrare worker email.

## Instanțe v2

- **Catalog nodeKey:** `e2:email:warm-send`
- **OTel (v2):** `cognitive.e2.email.warm-send`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:email:warm-send`**, coadă **`q:email:warm`**, worker `createEmailWarmSenderWorker`. | v2. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `fiscal-execution`. | v2: familie `email-cold` în antet. | — |
| 3 | Rol declarat | Trimitere mesaj warm prin Resend + audit intern. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `MotorNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + etapa 2 → `cognitive:e2:email:warm-send`. | v2 puncte. | — |
| 7 | Înveliș politică | ADR-0059: doar stări warm; altfel `throw`. | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Provider Resend + tag-uri `lead_id`/`tenant_id`. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu din acest procesor. | v2. | — |
| 11 | Micro-OODA | Validare → send → persistență → metrici. | v2. | — |
| 12 | Tier + de-escaladare | Eșec send sau gardă. | v2. | — |
| 13 | Stack | BullMQ, Resend API, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.warm-send`.
- **Cod:** `cognitive:e2:email:warm-send`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
