<!-- neuron-contract:author-complete -->

# Neuron `email:warm:document`

> **Status:** audit manual **2026-04-11**. Coada există în registry, dar **nu** implementează trimiterea de documente: procesează **tracking** pentru email warm (evenimente Resend).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:warm:document` |
| etapa | E2 |
| familie (v2) | `email-warm` |
| contract_path | `contracts/neurons/E2/email--warm--document.md` |
| ADR familie (indicativ) | [email-warm](../../adr/families/e2/email-warm.md) |

## Scop în context real

**v2 + catalog:** `MotorNeuron`, trimitere documente atașate via email warm (`e2:email:warm-document`). **Repo:** `createEmailWarmTrackingWorker` în `workers/outreach/src/workers/email.ts` (L643–701) pe `QUEUES.EMAIL_WARM_DOCUMENT` (`email:warm:document`): primește job-uri `EmailWarmTrackingJobData` (`email.sent` | `delivered` | `bounced` | `opened` | `clicked`), actualizează `outreach.communication_log` pentru rânduri `channel = EMAIL_WARM` după `externalMessageId`, și pentru `opened`/`clicked` incrementează `openCount` / `clickCount` pe `lead_journey`. Job-urile sunt puse în coadă de `createResendEventProcessorWorker` în `workers/outreach/src/workers/webhooks.ts` (L428–489) după ingest `webhook:resend:ingest`. **Divergență semantică:** numele cozii sugerează „document”, dar runtime = **tracking livrare/engagement**, nu emitere atașamente.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:warm:document\`` (L3320–3343).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:warm-document` / `email:warm:document` (L1168–1175).
- `workers/shared/src/queue-registry.ts` — `EMAIL_WARM_DOCUMENT` (L131, L802).
- `workers/outreach/src/workers/email.ts` — `EmailWarmTrackingJobData`, `createEmailWarmTrackingWorker` (L632–701).
- `workers/outreach/src/workers/webhooks.ts` — `warmTrackingQueue.add` (L476–488).
- `workers/outreach/src/index.ts` — înregistrare `createEmailWarmTrackingWorker` (L86, L196).

## Instanțe v2

- **Catalog nodeKey:** `e2:email:warm-document`
- **OTel (v2):** `cognitive.e2.email.warm-document`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI (v2 + cod fără LLM).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:email:warm-document`**, coadă **`email:warm:document`**, worker `createEmailWarmTrackingWorker`. | v2 `Confirmed queue field` aliniat cu registry. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `fiscal-execution`. | v2: familie `email-warm`. | — |
| 3 | Rol declarat | Tracking status + metrici journey pentru canal EMAIL_WARM după webhook Resend. | v2/catalog: trimitere documente — **nu reflectă codul**; reconciliere nume/semantică viitoare. | Divergență documentată în *Scop*. |
| 4 | NeuronType + SOFAI | **Catalog:** `MotorNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `MEDIUM`. | v2 MEDIUM. | — |
| 6 | Înveliș telemetrie | `createWorker` + etapa 2 → span `cognitive:e2:email:warm-document` (pattern worker-shared). | v2 `cognitive.e2.email.warm-document`. | Mapare atribut `cognitive.neuron.*` vs `cognitive.nodeKey`: **migrare planificată** fără dovadă per-linie în acest fișier. |
| 7 | Înveliș politică | Fără Cedar/OPA în handler; actualizare DB condiționată de `tenantId` + `externalMessageId`. | v2 Tier 4 + HITL la eșecuri repetate — comportament HITL **nu** apare în acest worker. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Idempotență parțială prin update pe chei naturale; fără NeMo în cod. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu din acest procesor. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job tracking; ORIENT: mapare `eventType` → status; DECIDE: update; ACT: SQL + counters journey. | v2 OODA pentru „send” — **nu** se potrivește literal; OODA operațional = tracking. | — |
| 12 | Tier + de-escaladare | Eșec job → retry BullMQ standard; fără prag de încredere în cod. | v2 trigger-e — fără dovadă în handler. | — |
| 13 | Stack | BullMQ, Postgres (`@cerniq/db`), integrare indirectă Resend via webhook upstream. | v2 §2.3 subset. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.warm-document`.
- **Cod:** convenție `cognitive:<nodeKey>` pentru worker E2 (vezi contract `q:email:warm`); **aliniat** ca pattern, fără citat `withCognitiveSpan` pe simbolul exact al acestui worker în această sesiune.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
