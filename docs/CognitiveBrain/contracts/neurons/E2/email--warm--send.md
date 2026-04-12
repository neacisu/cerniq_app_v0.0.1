<!-- neuron-contract:author-complete -->

# Neuron `email:warm:send`

> **Status:** audit manual **2026-04-11**. **Nu** există coadă BullMQ cu numele literal `email:warm:send` în registry; trimiterea warm este implementată ca **`q:email:warm`** (`e2:email:warm-send`). v2 marchează acest antet ca *graph-export-grounded*, ne-reconciliat — reconcilierea runtime este documentată aici.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:warm:send` |
| etapa | E2 |
| familie (v2) | `email-warm` |
| contract_path | `contracts/neurons/E2/email--warm--send.md` |
| ADR familie (indicativ) | [email-warm](../../adr/families/e2/email-warm.md) |

## Scop în context real

**v2:** antet `email:warm:send`, scop tranzacțional email warm, `MotorNeuron` inferat, câmp queue din export graf **fără** reconciliere inițială cu registry (L3370–3391). **Repo:** implementarea trimiterii este **aceeași** cu neuronul documentat în [`q--email--warm.md`](q--email--warm.md): `createEmailWarmSenderWorker` pe `QUEUES.EMAIL_WARM` = `q:email:warm`, Resend tranzacțional, gardă ADR-0059 `WARM_REPLY` / `NEGOTIATION`, `communication_log` OUTBOUND. **Convenție:** `email:warm:send` (v2) ≡ **`q:email:warm`** (runtime) + **`e2:email:warm-send`** (catalog).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:warm:send\`` (L3370–3391).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:warm-send` mapat la **`q:email:warm`** (L1150–1157).
- `workers/shared/src/queue-registry.ts` — `EMAIL_WARM: "q:email:warm"` (L129); **lipsă** cheie `email:warm:send`.
- `workers/outreach/src/workers/email.ts` — `createEmailWarmSenderWorker` (L476–549).
- `docs/CognitiveBrain/contracts/neurons/E2/q--email--warm.md` — contract canonic al cozii de trimitere.
- `apps/api/src/routes/outreach.ts` — răspuns API `queueName: "q:email:warm"` pentru canal EMAIL_WARM (L548).

## Instanțe v2

- **Catalog nodeKey (trimitere):** `e2:email:warm-send` — asociat cozii **`q:email:warm`**, nu `email:warm:send`.
- **OTel (v2):** `cognitive.email.warm.send` (antet v2) vs `cognitive.e2.email.warm-send` (bloc `q:email:warm` din aceeași sursă v2, L3317) — **două denumiri** în document; runtime span efectiv: vezi contract `q:email:warm`.

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Trimitere:** `e2:email:warm-send` → coadă **`q:email:warm`**. Literal **`email:warm:send`:** absent din `queue-registry.ts`. | v2 queue field `email:warm:send`. | Granța v2 §2.4: mapare explicită queue v2 ↔ runtime. |
| 2 | Etapă, familie, swimlane | **Catalog** pentru `e2:email:warm-send`: etapa 2, `fiscal-execution`. | v2 familie `email-warm`; swimlane email-warm în metrici v2 — catalog folosește `fiscal-execution`. | Mică divergență swimlane v2 vs catalog — ambele citate. |
| 3 | Rol declarat | Trimitere mesaj warm Resend + audit `communication_log` — vezi `q--email--warm.md`. | v2 operational purpose tranzacțional. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `MotorNeuron`. | v2 inferred MotorNeuron. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2 inferred HIGH. | — |
| 6 | Înveliș telemetrie | Același stack ca `q:email:warm`: `cognitive:e2:email:warm-send`. | v2 `cognitive.email.warm.send` **și** `cognitive.e2.email.warm-send` în secțiuni diferite ale planului. | **Migrare planificată** pentru un singur nume canonic span. |
| 7 | Înveliș politică | Gardă stări în `createEmailWarmSenderWorker` (ADR-0059). | v2 Tier 3. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Resend + tag-uri identitate lead/tenant. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu din acest procesor. | v2. | — |
| 11 | Micro-OODA | Validare stare → send Resend → persistență → metrici (detaliu în `q--email--warm.md`). | v2 OODA send. | — |
| 12 | Tier + de-escaladare | Throw pe încălcire canal / eșec send. | v2. | — |
| 13 | Stack | BullMQ, Resend, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2 (antet `email:warm:send`):** `cognitive.email.warm.send`.
- **v2 (bloc `q:email:warm`):** `cognitive.e2.email.warm-send`.
- **Cod:** `cognitive:e2:email:warm-send` — **aliniat** cu catalog + contract `q:email:warm`; numele `cognitive.email.warm.send` tratat ca **țintă / dublură document** până la unificare.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
