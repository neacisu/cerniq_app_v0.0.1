<!-- neuron-contract:author-complete -->

# Neuron `quota:guardian:reset`

> **Status:** audit manual **2026-04-11**. Reset zilnic Redis: șterge chei `quota:wa:*` și `sms:quota:*`; **nu** modifică istoricul Postgres `wa_quota_usage`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `quota:guardian:reset` |
| etapa | E2 |
| familie (v2) | `quota` |
| contract_path | `contracts/neurons/E2/quota--guardian--reset.md` |
| ADR familie (indicativ) | [quota](../../adr/families/e2/quota.md) |

## Scop în context real

**v2:** reset contoare la miezul nopții. **Repo:** `createQuotaDailyResetWorker` (`workers/outreach/src/workers/quota-guardian.ts`, L291–337) face `SCAN` + `DEL` pe pattern-uri. **Producător:** `workers/outreach/src/index.ts` (L221–225) înregistrează job repetat BullMQ `repeat: { pattern: "0 0 * * *", tz: "Europe/Bucharest" }` cu payload `{ source: "cron_quota_reset" }` (fără `tenantId`). **Observație telemetrie:** `buildCognitiveContextFromJob` poate ocoli `withCognitiveSpan` din fabrică din cauza lipsei `tenantId` pe job (vezi `factory.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`quota:guardian:reset\`` (L3983–4006).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:quota:guardian-reset` (L998–1006).
- `workers/shared/src/queue-registry.ts` — `QUOTA_GUARDIAN_RESET`.
- `workers/outreach/src/workers/quota-guardian.ts` — `createQuotaDailyResetWorker`.
- `workers/outreach/src/index.ts` — `repeat` cron enqueue (L221–225).
- `workers/outreach/src/lib/outreach-job-logger.js` sau `.ts` — `OUTREACH_SYSTEM_TENANT` pentru log (din import worker).

## Instanțe v2

- **Catalog nodeKey:** `e2:quota:guardian-reset`
- **OTel (v2):** `cognitive.e2.quota.guardian-reset`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:quota:guardian-reset`; coadă `quota:guardian:reset`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Curățare contoare Redis zilnic; păstrare istoric PG. | v2. | Comentariu în cod: PG neatinse. |
| 4 | NeuronType + SOFAI | Catalog: `AutonomicNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `MEDIUM`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + logger cu `OUTREACH_SYSTEM_TENANT`. | Span v2. | **Limită:** fără `tenantId` pe job → posibil fără `withCognitiveSpan` cognitiv (fabrică). |
| 7 | Înveliș politică | Concurrency 1; pattern-uri fixe Redis. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI v2. | N/A |
| 9 | Guardrails | Doar scan/delete — risc operațional dacă pattern prea larg (documentat în cod ca intenționat). | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: cron; ORIENT: keys; DECIDE: del; ACT: count. | v2 OODA mentenanță. | — |
| 12 | Tier + de-escaladare | Eșec Redis → throw. | v2. | — |
| 13 | Stack | BullMQ repeatable job, ioredis SCAN/DEL. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e2.quota.guardian-reset`.
- **Cod:** span cognitiv fabrică posibil **dezactivat** fără `tenantId` pe payload; logging outreach folosește tenant sistem — **parțial aliniat** ADR-0003.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
