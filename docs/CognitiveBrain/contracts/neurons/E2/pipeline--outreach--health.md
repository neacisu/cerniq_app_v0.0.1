<!-- neuron-contract:author-complete -->

# Neuron `pipeline:outreach:health`

> **Status:** audit manual **2026-04-11**. Worker **merge**: deduplicare evenimente Redis sau job cleanup retenție.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `pipeline:outreach:health` |
| etapa | E2 |
| familie (v2) | `monitoring` |
| contract_path | `contracts/neurons/E2/pipeline--outreach--health.md` |
| ADR familie (indicativ) | [monitoring](../../adr/families/e2/monitoring.md) |

## Scop în context real

**v2:** monitorizare sănătate pipeline outreach. **Repo:** `createMergedPipelineHealthWorker` (`workers/outreach/src/workers/webhooks.ts`, L556–570) pe `QUEUES.PIPELINE_OUTREACH_HEALTH`: dacă payload are `eventId`, rulează `executeEventDedupJob` (cheie Redis `dedup:${tenantId}:${source}:${eventId}`, TTL 24h); altfel tratează job-ul ca `CleanupJobData` și apelează `executeCleanupJob` din `monitoring.ts` (ștergere `communication_log` mai vechi decât `retainDays`, implicit 90). **Limită evidență:** la audit **2026-04-11** nu există apeluri `add` către această coadă în fișierele `.ts` din repo (căutare după nume constantă / string) — worker pornit din `workers/outreach/src/index.ts` (L164).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`pipeline:outreach:health\`` (L3692–3715).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:pipeline:outreach-health` (L1463–1471).
- `workers/shared/src/queue-registry.ts` — `PIPELINE_OUTREACH_HEALTH`.
- `workers/outreach/src/workers/webhooks.ts` — `executeEventDedupJob`, `createMergedPipelineHealthWorker`.
- `workers/outreach/src/workers/monitoring.ts` — `executeCleanupJob`, `CleanupJobData`.

## Instanțe v2

- **Catalog nodeKey:** `e2:pipeline:outreach-health`
- **OTel (v2):** `cognitive.e2.pipeline.outreach-health`

## N/A pe criterii

- **Rând 8:** **N/A** — non-AI în v2.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e2:pipeline:outreach-health`**, coadă `pipeline:outreach:health`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Dedup operațional sau mentenanță date istorice (nu health global explicit în ramura dedup). | v2: health pipeline. | Denumire v2 vs ramura cleanup = mapare parțială. |
| 4 | NeuronType + SOFAI | Catalog: `AttentionNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + span condiționat; dedup poate lipsi `tenantId` în unele payload-uri — verificare la runtime. | Span v2. | `EventDeduplicateJobData` include `tenantId`; cleanup include `tenantId?`. |
| 7 | Înveliș politică | Redis NX + EX pentru idempotență; cleanup PG. | v2 tier3. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI. | N/A |
| 9 | Guardrails | `concurrency: 50` pe worker merge. | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE câmpuri job; ACT dedup sau ștergere. | v2. | — |
| 12 | Tier + de-escaladare | Cleanup returnează `{ deleted }`. | v2. | — |
| 13 | Stack | BullMQ, Redis dedup, Postgres cleanup. | v2 §2.3. | **Producer neidentificat în repo (TS).** |

### Mapare OTel

- **v2:** `cognitive.e2.pipeline.outreach-health`.
- **Cod:** **aliniat** când `tenantId` disponibil pentru span (vezi `factory.ts`).

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
