<!-- neuron-contract:author-complete -->

# Neuron `webhook:resend:ingest`

> **Status:** audit manual **2026-04-11**. Tag `lead_id` → cozi warm document / proforma pentru tracking și click.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `webhook:resend:ingest` |
| etapa | E2 |
| familie (v2) | `webhooks` |
| contract_path | `contracts/neurons/E2/webhook--resend--ingest.md` |
| ADR familie (indicativ) | [webhooks](../../adr/families/e2/webhooks.md) |

## Scop în context real

**v2:** ingest Resend (email warm). **Repo:** `createResendEventProcessorWorker` (`webhooks.ts`, L428–493): extrage `lead_id` din tags; caută `lead_journey`; pentru `email.clicked` enqueue `EMAIL_WARM_PROFORMA`; mereu enqueue `EMAIL_WARM_DOCUMENT` cu tipul evenimentului.

## Surse audit

- v2 — L4083–4106.
- `packages/shared/src/cognitive-node-catalog.ts` — L1226–1234.
- `workers/outreach/src/workers/webhooks.ts`.

## Instanțe v2

- **Catalog nodeKey:** `e2:webhook:resend`
- **OTel (v2):** `cognitive.e2.webhook.resend`

## N/A pe criterii

- **Rând 8:** **N/A**.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:webhook:resend`. | v2. | — |
| 2 | Etapă, familie, swimlane | `data-ingest`. | v2. | — |
| 3 | Rol declarat | Rutare evenimente Resend către pipeline warm. | v2. | — |
| 4 | NeuronType + SOFAI | `SensoryNeuron`. | v2. | — |
| 5 | Criticitate | `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker`. | v2. | — |
| 7 | Înveliș politică | Depinde de tag-uri — fără journey, unele ramuri pot avea `journeyId` undefined. | v2. | **Limită:** comportament cu `lead_id` lipsă — verificare suplimentară recomandată. |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | Parsare tip `email.*` din payload Resend. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: webhook; ORIENT: tip; ACT: cozi warm. | v2. | — |
| 12 | Tier + de-escaladare | Continuă tracking chiar dacă journey lipsă (câmpuri opționale). | v2. | — |
| 13 | Stack | BullMQ, Postgres, `email:warm:document`, `email:warm:proforma`. | v2 §2.3. | Fără test dedicat în audit (în afara suitei generale). |

### Mapare OTel

- **v2:** `cognitive.e2.webhook.resend`.
- **Cod:** fabrică — aliniat condiționat.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
