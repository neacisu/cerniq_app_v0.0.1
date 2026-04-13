<!-- neuron-contract:author-complete -->

# Neuron `compliance:data:anonymize`

> **Status:** audit manual **2026-04-13**. **v2** (L7760–L7783): familie `compliance`, E4, **`Confirmed queue field: compliance:data:anonymize`**, catalog `e4:audit:data-anonymize`. **Repo:** coada BullMQ canonică este **`audit:data:anonymize`** (`E4_AUDIT_DATA_ANONYMIZE` în `queue-registry.ts` L485), worker J47 `j47-audit-anonymize.ts`, același comportament ca în contractul mirror [`audit--data--anonymize.md`](audit--data--anonymize.md). **Nealiniere v2:** numele cozii în v2 (`compliance:*`) ≠ literal registry (`audit:*`).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (v2) | `compliance:data:anonymize` |
| coadă runtime (registry) | `audit:data:anonymize` |
| etapa | E4 |
| familie (v2) | `compliance` |
| contract_path | `contracts/neurons/E4/compliance--data--anonymize.md` |
| contract mirror (același runtime) | [`audit--data--anonymize.md`](audit--data--anonymize.md) |
| ADR familie (indicativ) | [compliance](../../adr/families/e4/compliance.md) |

## Scop în context real

Anonimizare în `gold_audit_logs_etapa4` pentru înregistrări vechi (PII), cron săptămânal — detalii în contractul `audit:data:anonymize` (dovezi cod J47 + `index.ts`).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L7760–L7783 (atenție L7777: câmp `compliance:data:anonymize` vs cod).
- `workers/shared/src/queue-registry.ts` — `E4_AUDIT_DATA_ANONYMIZE` → `audit:data:anonymize` (L485).
- `packages/shared/src/cognitive-node-catalog.ts` — `n("e4:audit:data-anonymize", "audit:data:anonymize", …)` (în jurul L2668–L2676; vezi și fișierul citit la auditul J47).
- `workers/e4-postsale/src/workers/j47-audit-anonymize.ts` — procesor + `withCognitiveSpan("e4:audit:data:anonymize", …)`.
- `workers/e4-postsale/src/index.ts` — înregistrare worker + cron J47.
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- **L7760–L7783:** `ComplianceNeuron`, swimlane `audit-compliance`, criticitate HIGH, span `cognitive.e4.audit.data-anonymize`, coadă în text v2 `compliance:data:anonymize`.

## N/A pe criterii

- **8 — Rutare model:** N/A — non-AI (v2 L7779).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`audit:data:anonymize`** + `e4:audit:data-anonymize` (catalog); **nu** `compliance:data:anonymize` în registry. | v2: `compliance:data:anonymize` (L7777). | Prefix semantic v2 vs implementare. |
| 2 | Etapă, familie, swimlane | Catalog: etapă `4`, `audit-compliance`. | v2: E4, familie `compliance` (L7762–L7763). | — |
| 3 | Rol declarat | Anonimizare GDPR audit logs (J47 header + SQL). | v2 L7774–L7776. | — |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` (catalog + v2 L7768). | v2 L7768. | — |
| 5 | Criticitate | Catalog + v2: HIGH. | v2 L7771. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:audit:data:anonymize", …)` vs `nodeKey` catalog `e4:audit:data-anonymize` — vezi contract `audit--data--anonymize` (nealiniere `:` vs `-` pentru îmbogățire catalog). | v2 span L7782. | Același risc ca J47 mirror. |
| 7 | Înveliș politică | Cron + HITL în text v2 (L7780). | v2 L7780. | — |
| 8 | Rutare model (dacă AI) | **N/A** | L7779. | — |
| 9 | Guardrails | `PII_FIELDS` determinist (J47). | — | — |
| 10 | Escaladare HITL | — | v2 L7780. | — |
| 11 | Micro-OODA | UPDATE SQL anonimizare. | v2 L7778. | — |
| 12 | Tier + de-escaladare | Tier 3 v2 (L7772). | v2. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4 + Postgres. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.audit.data-anonymize`.
- **Cod:** span `cognitive:e4:audit:data:anonymize` (primul argument `withCognitiveSpan` în J47) — detalii în [`audit--data--anonymize.md`](audit--data--anonymize.md).

---
*Audit manual 2026-04-13.*
