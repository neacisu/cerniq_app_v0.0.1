<!-- neuron-contract:author-complete -->

# Neuron `email:cold:analytics:fetch`

> **Status:** audit manual **2026-04-11**. Coada este aliniată literal cu registry/catalog; procesorul **agregă din Postgres**, nu apelează API-ul Instantly `getCampaignAnalytics` (disponibil în client, dar nefolosit pe această coadă la audit).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `email:cold:analytics:fetch` |
| etapa | E2 |
| familie (v2) | `email-cold` |
| contract_path | `contracts/neurons/E2/email--cold--analytics--fetch.md` |
| ADR familie (indicativ) | [email-cold](../../adr/families/e2/email-cold.md) |

## Scop în context real

**v2:** `SensoryNeuron`, swimlane `dedup-scoring`, extragere metrici performanță campanie email, ingest date externe în ciclul OODA. **Repo:** `createMergedEmailColdAnalyticsWorker` în `workers/outreach/src/workers/sequences.ts` înregistrează **un singur** worker pe `QUEUES.EMAIL_COLD_ANALYTICS_FETCH` (`email:cold:analytics:fetch`). Procesorul este **multiplexat** după forma `job.data`:

- dacă există **`sequenceId`** → `executeSequenceStatsJob`: agregări SQL pe `sequenceEnrollments` + `communicationLog` pentru secvența respectivă (sent/opened/reply rates, enrolment counts);
- altfel → `executeDailyReportJob` din `monitoring.ts`: rollup pe `communicationLog.created_at` + snapshot `leadJourney` + opțional rând `outreachDailyStats` pentru ziua `reportDate`.

**Nu** s-a găsit apel la `InstantlyClient.getCampaignAnalytics` pe această coadă. Specificația veche (`etapa2-workers-D-E-email.md`) menționează Instantly; **decalaj** față de implementarea curentă (sursă adevăr = cod).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`email:cold:analytics:fetch\`` (L3170–3193).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:email:cold-analytics` / `email:cold:analytics:fetch` (L1130–1137).
- `workers/shared/src/queue-registry.ts` — `EMAIL_COLD_ANALYTICS_FETCH` (L125, L796).
- `workers/outreach/src/index.ts` — `registerCognitiveWorkerEtapa(2)`.
- `workers/outreach/src/workers/sequences.ts` — `createMergedEmailColdAnalyticsWorker`, `executeSequenceStatsJob` (L449–544).
- `workers/outreach/src/workers/monitoring.ts` — `executeDailyReportJob`, `loadDayCommunicationRollup` (L60–121, L225–287).
- `packages/integrations/src/instantly/client.ts` — `getCampaignAnalytics` (L310–313) — **nu** referit din procesorul de mai sus.
- `workers/outreach/src/workers/sequences.test.ts` — înregistrare worker pe coadă (L496+).

## Instanțe v2

### Instanță 1 — `email-cold` (v2 ~L3170)

- **Catalog nodeKey:** `e2:email:cold-analytics`
- **Confirmed queue field:** `email:cold:analytics:fetch`
- **OTel span name (v2):** `cognitive.e2.email.cold-analytics`

### Extras câmpuri v2

- Metrici Prometheus exemplu în v2 — în codul workerului nu apare același prefix; observabilitate practică: `createWorker` + agregări interne.

## N/A pe criterii

- **Rând 8:** **N/A** — fără LLM în `executeSequenceStatsJob` / `executeDailyReportJob`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Catalog:** `e2:email:cold-analytics`, coadă **`email:cold:analytics:fetch`**. **Worker:** `createMergedEmailColdAnalyticsWorker` + `QUEUES.EMAIL_COLD_ANALYTICS_FETCH` (`sequences.ts` L528–531). | v2: aceeași coadă și nodeKey. | — |
| 2 | Etapă, familie, swimlane | **Catalog:** `etapa: 2`, `swimlane: "dedup-scoring"`. **Bootstrap:** etapă 2 outreach. | v2: E2, `email-cold`, `dedup-scoring`. | — |
| 3 | Rol declarat | Agregare metrici outreach din DB (per secvență sau raport zilnic cu canal email cold). | v2: extragere metrici campanie email; OODA menționează ingest extern. | Sursa datelor este **internă** (PG), nu API Instantly pe această coadă. |
| 4 | NeuronType + SOFAI | **Catalog:** `SensoryNeuron`. | v2: `SensoryNeuron`. | — |
| 5 | Criticitate | **Catalog:** `LOW`. | v2: `LOW`. | — |
| 6 | Înveliș telemetrie | **`createWorker`** + etapă 2 → span **`cognitive:e2:email:cold-analytics`** (`factory.ts`, `cognitive-helpers.ts`). **v2:** `cognitive.e2.email.cold-analytics`. | ADR-0003. | Notație puncte vs două puncte. |
| 7 | Înveliș politică | **Fără** Cedar/OPA. Rutare internă după `sequenceId` în payload (`sequences.ts` L535–538). | v2: Tier 4, fără HITL. | — |
| 8 | Rutare model (dacă AI) | N/A. | Non-AI. | — |
| 9 | Guardrails | Validare implicită SQL + structuri job; **fără** NeMo. | v2 + ADR-0007. | NeMo: țintă. |
| 10 | Escaladare HITL | **Nu** enfilează `human:*` din aceste funcții. | v2: fără HITL. | — |
| 11 | Micro-OODA | Observe (citire DB), Orient (agregare), Decide (returnare obiect rezultat), Act (fără enqueue obligatoriu în `executeSequenceStatsJob`; daily report returnează JSON). | v2 OODA citește „enqueue downstream” — **nu** observat în `executeSequenceStatsJob`. | Pasul „ACT: enqueue downstream” din v2 nu e mapat 1:1 în `executeSequenceStatsJob`. |
| 12 | Tier + de-escaladare | Eșec = excepții DB / BullMQ retry implicit. **Fără** prag încredere. | v2 §2.2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres (`communicationLog`, `sequenceEnrollments`, `outreachDailyStats`, `leadJourney`). | v2 §2.3. | Client Instantly prezent în monorepo dar neconectat la acest worker. |

### Mapare OTel

- **v2:** `cognitive.e2.email.cold-analytics`.
- **Cod:** `cognitive:e2:email:cold-analytics` + atribute din catalog când `tenantId` e prezent în `job.data` (ambele tipuri de job au `tenantId`).
- **Stare:** **parțial aliniat** — același `nodeKey`, semantică date ≠ „fetch Instantly” din specificații istorice.

### Limită evidență (producători job)

La căutare în `apps/` și `workers/` (excl. definirea workerului) **nu** a fost găsit un apel `.add(...)` către `email:cold:analytics:fetch` la data auditului; enqueuing-ul poate fi în cod necitit, cron sau integrare externă.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
