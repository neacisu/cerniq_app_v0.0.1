<!-- neuron-contract:author-complete -->

# Neuron `email:cold:campaign:create`

> **Status:** audit manual **2026-04-11**. Coadă aliniată registry/catalog; procesor minimal în `extra-dispatch.ts`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:campaign:create` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/email--cold--campaign--create.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `ProceduralNeuron`, creare campanie cold în Instantly. **Repo:** `createEmailColdCampaignCreateWorker` (`workers/outreach/src/workers/extra-dispatch.ts`) consumă `QUEUES.EMAIL_COLD_CAMPAIGN_CREATE` (`email:cold:campaign:create`), apelează `getInstantlyClient().createCampaign(job.data)` unde `job.data` respectă `CreateCampaignRequest` (`name` obligatoriu, `daily_sending_limit` opțional) — vezi `packages/integrations/src/instantly/types.ts`. Răspunsul API propagă id campanie creată. Worker înregistrat în `workers/outreach/src/index.ts` (L101, L216). **Notă:** `createWorker` folosește `{ concurrency: 2 }` în fișier; `queue-registry.ts` listează concurrency **5** pentru aceeași coadă (posibil metadate monitor vs opțiune efectivă worker).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:campaign:create\`` (~L3195–3218).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-campaign-create` (L1112–1120).
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD_CAMPAIGN_CREATE` (L123, L794).
- `workers/outreach/src/workers/extra-dispatch.ts` — `createEmailColdCampaignCreateWorker` (L44–53).
- `packages/integrations/src/instantly/client.ts` — `createCampaign` POST `/campaign` (L316–320).
- `workers/outreach/src/index.ts` — bootstrap (L101, L216).

## Instanțe v2

### Instanță 1 — `email-cold` (v2 ~L3195)

- **Catalog nodeKey:** `e2:email:cold-campaign-create`
- **OTel span name (v2):** `cognitive.e2.email.cold-campaign-create`

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în procesor.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog + registry:** `e2:email:cold-campaign-create` / `email:cold:campaign:create`. **Worker:** `extra-dispatch.ts` L45–46. | v2: aceeași coadă. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** etapa 2, `pipeline-control`. **Outreach:** `registerCognitiveWorkerEtapa(2)`. | v2: E2, `email-cold`, `pipeline-control`. | — |
| 3 | Rol declarat | Creare campanie Instantly din payload job. | v2: creare campanie cold Instantly. | — |
| 4 | NeuronType + SOFAI | **Catalog:** `ProceduralNeuron`. | v2: `ProceduralNeuron`. | — |
| 5 | Criticitate | **Catalog:** `MEDIUM`. | v2: `MEDIUM`. | — |
| 6 | Înveliș telemetrie | `createWorker` → `cognitive:e2:email:cold-campaign-create` când `tenantId` lipsește din payload, instrumentarea cognitivă poate ocoli procesorul (`factory.ts` L105–106); **payload-ul curent** al jobului are doar `name` / `daily_sending_limit` — **fără** `tenantId` în tipul din `extra-dispatch.ts` L47. | v2: span `cognitive.e2.email.cold-campaign-create`. | Risc: span cognitiv cu context incomplet dacă nu există `tenantId` pe job. |
| 7 | Înveliș politică | **Fără** Cedar/OPA; retry la erori HTTP prin client Instantly. | v2: HITL la eșecuri repetate, SLA 8h. | Mapare SLA/HITL: neobservată în procesor. |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Validare erori HTTP în `InstantlyClient`; **fără** NeMo. | ADR-0007. | NeMo: destinație documentată. |
| 10 | Escaladare HITL | **Nu** enfilează `human:*`. | v2: HITL după 3+ erori. | — |
| 11 | Micro-OODA | Observe (body job), Act (POST `/campaign`). | v2 OODA detaliat. | Pași ORIENT/DECIDE expliciți: minimali în cod. |
| 12 | Tier + de-escaladare | Eșec → excepție + retry BullMQ. | v2 Tier 4. | — |
| 13 | Stack | BullMQ, Instantly HTTP, OTel opțional pe tenant. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.email.cold-campaign-create`.
- **Cod:** `cognitive:e2:email:cold-campaign-create` dacă instrumentarea activă și contextul job permite.
- **Stare:** verificare necesară că job-urile includ `tenantId` dacă se cere acoperire observabilitate completă.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
