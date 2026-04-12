<!-- neuron-contract:author-complete -->

# Neuron `quota:guardian:check`

> **Status:** audit manual **2026-04-11**. Worker BullMQ + funcție partajată `quotaGuardianCheck` / `executeQuotaCheck`: script Redis Lua atomic (cotă, status telefon, ore program, cost new vs follow-up).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `quota:guardian:check` |
| etapa | E2 |
| familie (v2) | `quota` |
| contract_path | `contracts/neurons/E2/quota--guardian--check.md` |
| ADR familie (indicativ) | [quota](../../adr/families/e2/quota.md) |

## Scop în context real

**v2:** gardian cotă înainte de trimitere; OODA menționează NeMo — **neimplementat** în cod. **Repo:** `createQuotaCheckWorker` (`workers/outreach/src/workers/quota-guardian.ts`, L164–212) și `executeQuotaCheck` (L127–162) evaluează `QUOTA_CHECK_LUA` (`workers/outreach/src/utils/quota-lua.ts`): status `phone:status:*`, `OUTSIDE_BUSINESS_HOURS` pe oră 9–18, follow-up `cost=0` mereu permis, altfel INCRBY Redis + TTL 48h pentru contact nou. `quotaGuardianCheck` este apelat direct din `createWaWorker` (`whatsapp.ts`, L134) înainte de send. **Metrică:** `outreachWaQuotaUsage.set` după check.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`quota:guardian:check\`` (L3933–3956).
- `packages/shared/src/cognitive-node-catalog.ts` — `e2:quota:guardian-check` (L980–988).
- `workers/shared/src/queue-registry.ts` — `QUOTA_GUARDIAN_CHECK`.
- `workers/outreach/src/workers/quota-guardian.ts` — worker + tipuri `QuotaCheckJobData`, `QuotaCheckResult`.
- `workers/outreach/src/utils/quota-lua.ts` — `QUOTA_CHECK_LUA`.
- `workers/outreach/src/workers/whatsapp.ts` — apel `quotaGuardianCheck`.
- `workers/outreach/src/utils/quota-lua.test.ts` — teste constante și chei (L1–60+).

## Instanțe v2

- **Catalog nodeKey:** `e2:quota:guardian-check`
- **OTel (v2):** `cognitive.e2.quota.guardian-check`

## N/A pe criterii

- **Rând 8:** **N/A** — Non-AI; fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | `e2:quota:guardian-check`; coadă `quota:guardian:check`. | v2. | — |
| 2 | Etapă, familie, swimlane | Catalog: etapa 2, `pipeline-control`. | v2. | — |
| 3 | Rol declarat | Permite/blochează trimiterea pe bază cotă + ore + status linie. | v2. | — |
| 4 | NeuronType + SOFAI | Catalog: `GuardrailNeuron`. | v2. | — |
| 5 | Criticitate | Catalog / v2: `HIGH`. | v2. | — |
| 6 | Înveliș telemetrie | `createWorker` + `createOutreachJobLogger`. | Span v2. | Calea WA apelează Lua fără a trece neapărat prin coada BullMQ `quota:guardian:check`. |
| 7 | Înveliș politică | Reguli în Lua + timeout worker (opțiuni BullMQ). | v2 tier 3. | — |
| 8 | Rutare model (dacă AI) | N/A | v2 OODA menționează NeMo — **țintă**, nu cod. | N/A |
| 9 | Guardrails | Lua = sursa de adevăr pentru cotă/oră/status. | ADR-0056, ADR-0057 context. | — |
| 10 | Escaladare HITL | Nu în acest worker. | v2. | — |
| 11 | Micro-OODA | OBSERVE: Redis keys; ORIENT: reguli; DECIDE: JSON rezultat; ACT: return / metrică. | v2 (fără NeMo în cod). | — |
| 12 | Tier + de-escaladare | `allowed: false` cu motive explicite (`QUOTA_EXCEEDED`, etc.). | v2. | — |
| 13 | Stack | BullMQ, Redis `EVALSHA`, Postgres logging job. | v2 §2.3. | Teste: helperi chei/Lua string, nu worker complet integrat. |

### Mapare OTel

- **v2:** `cognitive.e2.quota.guardian-check`.
- **Cod:** instrumentare fabrică + job logger; apeluri directe `quotaGuardianCheck` pot lipsi span-ul cozii `quota:guardian:check` — **dovadă parțială** pe calea WA.

---
*Generator inițial:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py` — înlocuit prin audit manual.
