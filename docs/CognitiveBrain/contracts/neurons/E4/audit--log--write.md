<!-- neuron-contract:author-complete -->

# Neuron `audit:log:write`

> **Status:** audit manual **2026-04-13**. **v2** (L6302–L6325): coadă `audit:log:write`, `ComplianceNeuron`, `CRITICAL`, scriere jurnal cu lanț SHA-256, concurrency serializare. **Repo:** **J45** — `queue-registry.ts` L481, worker `concurrency: 1` (`index.ts` L500–504), `j45-audit-log-write.ts`. **Nealiniere catalog ↔ span:** catalog `e4:audit:log-write` (L2651) vs `withCognitiveSpan("e4:audit:log:write", …)` (L52–53). **Nealiniere documentație inline J45:** comentariu antet promite „Redis lock per tenantId” (L7–15) dar **implementarea L49–138 nu conține** apeluri de lock — serializarea se bazează pe `concurrency: 1` în config (L1200–L1201) + logică DB.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `audit:log:write` |
| etapa | E4 |
| familie (v2) | `audit` |
| contract_path | `contracts/neurons/E4/audit--log--write.md` |
| ADR familie (indicativ) | [audit](../../adr/families/e4/audit.md) |

## Scop în context real

**Cod:** pentru fiecare job, citește ultimul rând audit al tenantului, calculează `prevHash` din hash-ul intrării anterioare sau `GENESIS_HASH`, inserează rând nou în `gold_audit_logs_etapa4` (L70–120), returnează hash-ul noului rând (L122–135). Aliniat la scopul v2 de lanț criptografic per tenant.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6302–L6325.
- `workers/shared/src/queue-registry.ts` — `E4_AUDIT_LOG_WRITE` (L481); J45 concurrency (L1200–L1201).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:audit:log-write` (L2650–L2658).
- `workers/e4-postsale/src/workers/j45-audit-log-write.ts` — procesor (L49–138); comentariu Redis lock (L7–15) vs corp.
- `workers/e4-postsale/src/index.ts` — worker J45 (L500–504).
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — suită J45 (L695+).
- `workers/shared/src/queue-registry.test.ts` — concurrency J45 (L340+).
- `workers/shared/src/cognitive-helpers.ts` — L225–234, L226.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6321).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă + worker J45; catalog `e4:audit:log-write`. | v2 L6319. | Span key `e4:audit:log:write` ≠ catalog. |
| 2 | Etapă, familie, swimlane | `audit-compliance`, etapă 4 (L2655–L2656). | v2 L6312–L6313. | — |
| 3 | Rol declarat | Inserare audit cu `prevHash` calculat (L86–120). | v2 L6316–L6318. | — |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` (L2654). | v2 L6310. | — |
| 5 | Criticitate | `CRITICAL` catalog (L2657). | v2 `CRITICAL` L6313. | — |
| 6 | Înveliș telemetrie | `cognitive:e4:audit:log:write` (L52–53, L226). | v2 `cognitive.e4.audit.log-write` (L6324). | Același tip de diferență ca la J47. |
| 7 | Înveliș politică | — | HITL mandatory etc. (v2 L6322). | — |
| 8 | Rutare model (dacă AI) | **N/A** | L6321. | — |
| 9 | Guardrails | Hash chain determinist; fără ștergere (comentariu L20). | — | — |
| 10 | Escaladare HITL | — | v2 L6322. | — |
| 11 | Micro-OODA | SELECT ultimul + INSERT. | v2 OODA generic (L6320). | — |
| 12 | Tier + de-escaladare | — | Tier 2 (L6314). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + Drizzle/DB. | — | Comentariu Redis lock neimplementat în corp. |

### Mapare OTel

- **v2:** `cognitive.e4.audit.log-write` (L6324).
- **Cod:** `cognitive:e4:audit:log:write`. Reconciliere cu `e4:audit:log-write` din catalog pentru atribute automate.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
