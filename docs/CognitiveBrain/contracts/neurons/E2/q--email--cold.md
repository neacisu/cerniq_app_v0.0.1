<!-- neuron-contract:author-complete -->

# Neuron `q:email:cold`

> **Status:** audit manual **2026-04-11**. Coada **canonică în registry** pentru trimiterea emailului cold; semantic echivalent cu operația descrisă la `email:cold:add-to-campaign` în v2 (acolo numele de coadă diferă — vezi contractul aceluia).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `q:email:cold` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/q--email--cold.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `MotorNeuron`, `e2:email:cold-send`, trimitere outreach cold via Instantly, coadă confirmată `q:email:cold`. **Repo:** `createEmailColdSenderWorker` în `workers/outreach/src/workers/email.ts` consumă `QUEUES.EMAIL_COLD` (literal `q:email:cold`): `addLead` Instantly, jurnal `communicationLog`, tranziție opțională `COLD` → `CONTACTED_EMAIL`, metrici `outreachMessagesSentTotal`, gardă **ADR-0059**. **Contract încrucișat:** `email--cold--add-to-campaign.md` documentează aceeași cale cu numele v2 alternativ.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`q:email:cold\`` (~L3270–3293).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-send` / `q:email:cold`.
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD` (L122, L793).
- `workers/outreach/src/workers/email.ts` — `createEmailColdSenderWorker` (L121–214).
- `workers/outreach/src/workers/outreach-metrics.test.ts` — procesor `q:email:cold` (L358+).
- `docs/CognitiveBrain/contracts/neurons/E2/email--cold--add-to-campaign.md` — mapare alias v2.

## Instanțe v2

- **Catalog nodeKey:** `e2:email:cold-send`
- **OTel (v2):** `cognitive.e2.email.cold-send`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:email:cold-send`** ↔ **`q:email:cold`**; același worker ca pentru aliasul `email:cold:add-to-campaign`. | v2: `q:email:cold`. | Două intrări v2 pentru același flux (add-to-campaign vs q). |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `fiscal-execution`. | v2. | — |
| 3 | Rol declarat | Înrolare lead Instantly + logging + tranziție stare. | v2. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `MotorNeuron`. | v2. | — |
| 5 | Criticitate | **Catalog:** `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `cognitive:e2:email:cold-send` prin `createWorker` + etapa 2. | v2 puncte. | — |
| 7 | Înveliș politică | ADR-0059 guard stări lead. | v2 Tier 3 + HITL. | — |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Rate limit Instantly pe `addLead`; gardă canal. | ADR-0007. | — |
| 10 | Escaladare HITL | Nu direct din procesor. | v2. | — |
| 11 | Micro-OODA | Payload job → API → DB → cozi stare. | v2. | — |
| 12 | Tier + de-escaladare | Eșec API / încălcare gardă. | v2. | — |
| 13 | Stack | BullMQ, Instantly, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.cold-send`.
- **Cod:** `cognitive:e2:email:cold-send`.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
