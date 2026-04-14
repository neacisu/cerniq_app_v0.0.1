<!-- neuron-contract:author-complete -->

# Neuron `alert:phone:banned`

> **Status:** audit manual **2026-04-11**. Worker dedicat pe coadă; emitere din monitorul de sănătate telefon când status devine `BANNED`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:phone:banned` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/alert--phone--banned.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** alertă pentru linie WhatsApp marcată banată. **Repo:** `createPhoneHealthMonitorWorker` (`workers/outreach/src/workers/phone-monitoring.ts`, L166–274) apelează TimelinesAI `getAccountStatus`; la tranziție către `BANNED` enfilează `QUEUES.ALERT_PHONE_BANNED` cu `PhoneBannedAlertJobData` (L214–226) și, separat, `phone:quarantine:trigger`. Consumatorul `createAlertPhoneBannedWorker` (`workers/outreach/src/workers/extra-dispatch.ts`, L145–190): (1) dacă payload-ul este moștenit pentru quarantine reputație, redirecționează către `PHONE_QUARANTINE`; (2) pentru payload valid `PhoneBannedAlertJobData`, doar `svcLog.warn` și `{ logged: true }` — **fără** insert în `webhook_event_archive` (spre deosebire de `alert:phone:offline`). **Notă:** există și `createAlertWorker` pe `alert:bounce:high` în `monitoring.ts`, care **nu** procesează această coadă.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`alert:phone:banned\`` (L3567–3590).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:alert:phone-banned` (L1378–1386).
- `workers/shared/src/queue-registry.ts` — `ALERT_PHONE_BANNED`.
- `workers/outreach/src/workers/phone-monitoring.ts` — `createPhoneHealthMonitorWorker`, `PhoneBannedAlertJobData`.
- `workers/outreach/src/workers/extra-dispatch.ts` — `createAlertPhoneBannedWorker`.
- `workers/outreach/src/workers/extra-dispatch-phone-banned.test.ts` — teste payload legacy / invalid.
- `workers/outreach/src/index.ts` — înregistrare workeri.

## Instanțe v2

- **Catalog nodeKey:** `e2:alert:phone-banned`
- **OTel (v2):** `cognitive.e2.alert.phone-banned`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:alert:phone-banned`**, coadă `alert:phone:banned`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Log + validare payload; forward quarantine legacy; fără arhivă webhook în calea standard. | v2: alertă ban. | Divergență față de `alert:phone:offline` (fără DB audit în handler). |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `CRITICAL`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` condiționat de `tenantId` (`factory.ts`). | Span v2. | — |
| 7 | Înveliș politică | Fără Cedar/OPA în handler; quarantine pe altă coadă. | v2 tier2 + HITL. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Validare `isPhoneBannedAlertPayload` / legacy detect. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu enfilează `human:*` din acest worker; quarantine declanșat din `phone-monitoring`. | v2. | — |
| 11 | Micro-OODA | OBSERVE job; DECIDE legacy vs valid; ACT log sau forward. | v2. | — |
| 12 | Tier + de-escaladare | Payload invalid → `throw` (retry BullMQ). | v2. | — |
| 13 | Stack | BullMQ, integrare TimelinesAI (producător), worker outreach. | v2 §2.3 subset. | — |

### Mapare OTel

- **v2:** `cognitive.e2.alert.phone-banned`.
- **Cod:** span automat din `createWorker` — **aliniat** când `tenantId` în `job.data`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
