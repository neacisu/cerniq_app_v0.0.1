<!-- neuron-contract:author-complete -->

# Neuron `quota:guardian:increment`

> **Status:** audit manual **2026-04-11**. Worker persistă utilizarea în Postgres (`wa_quota_usage` upsert); incrementul Redis pentru contacte noi este deja în **Lua** `QUOTA_CHECK_LUA` la allow.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `quota:guardian:increment` |
| etapa | E2 |
| familie (v2) | `quota` |
| contract_path | `contracts/neurons/E2/quota--guardian--increment.md` |
| ADR familie (indicativ) | [quota](../../adr/families/e2/quota.md) |

## Scop în context real

**v2:** increment contor după trimitere. **Repo:** `createQuotaIncrementWorker` (`workers/outreach/src/workers/quota-guardian.ts`, L226–283) inserează/actualizează `waQuotaUsage` (`messagesSent`, `newContacts`, `followUps` în funcție de `cost` 0|1), apoi citește cheia Redis `getQuotaKey` pentru `newTotal` în răspuns. **Producător:** căutare `QUOTA_GUARDIAN_INCREMENT` / `quota:guardian:increment` în `.ts` din monorepo (exclus definiții) → **0 apeluri `add`** găsite la audit — **Limită evidență** (cron, API altundeva, sau flux neconectat). Trimiterea WA actuală nu enfilează acest job în `whatsapp.ts` observat.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`quota:guardian:increment\`` (L3958–3981).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:quota:guardian-increment` (L989–997).
- `workers/shared/src/queue-registry.ts` — `QUOTA_GUARDIAN_INCREMENT`.
- `workers/outreach/src/workers/quota-guardian.ts` — `createQuotaIncrementWorker`, `QuotaIncrementJobData`.
- `workers/outreach/src/utils/quota-lua.ts` — `INCRBY` în Lua pentru calea pre-send.
- Grep monorepo producători coadă — lipsă la audit 2026-04-11.

## Instanțe v2

- **Catalog nodeKey:** `e2:quota:guardian-increment`
- **OTel (v2):** `cognitive.e2.quota.guardian-increment`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:quota:guardian-increment`; coadă `quota:guardian:increment`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Mirror PG al utilizării + reconciliere cu Redis read. | v2 „după trimitere”. | Lua incrementează deja la check pentru new contact — posibil suprapunere / dublură conceptuală. |
| 4 | NeuronType + SOFAI | Catalog: `ProceduralNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + job logger. | Span v2. | Fără dovezi de volum job dacă nu există producători. |
| 7 | Înveliș politică | `setSessionTenantId`, upsert pe `(phoneId, usageDate)`. | v2. | — |
| 8 | Rutare model (dacă AI) | N/A | Non-AI v2. | N/A |
| 9 | Guardrails | SQL `onConflictDoUpdate`. | v2. | — |
| 10 | Escaladare HITL | Nu. | v2. | — |
| 11 | Micro-OODA | OBSERVE: job; ORIENT: cost; DECIDE: upsert; ACT: return totals. | v2. | — |
| 12 | Tier + de-escaladare | Eroare DB → throw. | v2. | — |
| 13 | Stack | BullMQ, Postgres Drizzle, Redis GET. | v2 §2.3. | **Producători neidentificați** în TS la audit. |

### Mapare OTel

- **v2:** `cognitive.e2.quota.guardian-increment`.
- **Cod:** fabrică `withCognitiveSpan` când `tenantId` pe `job.data` — aliniat dacă job-urile sunt emise; altfel neuron „dormant” operațional.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
