<!-- neuron-contract:author-complete -->

# Neuron `audit:data:anonymize`

> **Status:** audit manual **2026-04-13**. **v2** (L6277–L6300): coadă `audit:data:anonymize`, `ComplianceNeuron`, cron `0 2 * * 0`, anonimizare GDPR. **Repo:** implementat ca **J47** — același nume de coadă în `queue-registry.ts` (L485), worker + cron în `index.ts` (L515–520, L666–674), procesor `j47-audit-anonymize.ts`. **Nealiniere:** `withCognitiveSpan` folosește `e4:audit:data:anonymize` (L67–68) în timp ce catalogul declară `e4:audit:data-anonymize` (L2669) → risc ca `getNodeByKey` să nu atașeze atribute catalog pe span (vezi `cognitive-helpers.ts` L225–234).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `audit:data:anonymize` |
| etapa | E4 |
| familie (v2) | `audit` |
| contract_path | `contracts/neurons/E4/audit--data--anonymize.md` |
| ADR familie (indicativ) | [audit](../../adr/families/e4/audit.md) |

## Scop în context real

**v2:** anonimizare PII în `gold_audit_logs_etapa4` pentru înregistrări vechi (L6291–L6293). **Cod:** UPDATE pe `gold.gold_audit_logs_etapa4` cu `jsonb_object_agg` pentru chei din `PII_FIELDS` (L75–105), retenție `7 years` (L104), `actor_id` NULL, coloane `ip_address` / `user_agent` anonimizate (L99–101). Cron repeat `0 2 * * 0`, `jobId` `audit:data:anonymize:cron` (`index.ts` L666–674).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — L6277–L6300.
- `workers/shared/src/queue-registry.ts` — `E4_AUDIT_DATA_ANONYMIZE` (L485); concurrency (L1204–L1205).
- `packages/shared/src/cognitive-node-catalog.ts` — `n("e4:audit:data-anonymize", "audit:data:anonymize", …)` (L2668–L2676).
- `workers/e4-postsale/src/workers/j47-audit-anonymize.ts` — procesor, `PII_FIELDS`, `withCognitiveSpan("e4:audit:data:anonymize", …)` (L64–68).
- `workers/e4-postsale/src/index.ts` — worker J47 (L515–520); cron (L666–674).
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — suită J47 (L860+).
- `workers/shared/src/cognitive-helpers.ts` — `cognitive:${nodeKey}` (L226); îmbogățire atribute din catalog doar dacă `getNodeByKey(nodeKey)` găsește intrare (L225–234).
- [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L6296).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Registry + catalog: `audit:data:anonymize`; worker J47. | v2 L6294. | `nodeKey` span ≠ `nodeKey` catalog (`:` vs `-`). |
| 2 | Etapă, familie, swimlane | Catalog: etapă `4`, `audit-compliance` (L2673–L2674). | v2 `audit`, swimlane `audit-compliance` în catalog; metrică v2 include `audit-compliance` (L6298). | — |
| 3 | Rol declarat | Anonimizare GDPR fără ștergere rânduri (header J47 L16–19). | v2 L6291–L6293. | — |
| 4 | NeuronType + SOFAI | `ComplianceNeuron` (L2672). | v2 L6285. | — |
| 5 | Criticitate | Catalog: `HIGH` (L2675). | v2 `HIGH` L6288. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:audit:data:anonymize", …)` → span `cognitive:e4:audit:data:anonymize`. | v2 `cognitive.e4.audit.data-anonymize` (L6299). | Segmentare `:` în span vs `-` în `nodeKey` catalog. |
| 7 | Înveliș politică | — | HITL on anomaly etc. (v2 L6297). | Politici v2 vs cod: necomparat exhaustiv. |
| 8 | Rutare model (dacă AI) | **N/A** | L6296. | — |
| 9 | Guardrails | Listă PII deterministă `PII_FIELDS` (L41–56). | — | — |
| 10 | Escaladare HITL | — | v2 L6297. | — |
| 11 | Micro-OODA | UPDATE SQL determinist. | v2 OODA generic (L6295). | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6289). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ + `@cerniq/db` SQL. | — | — |

### Mapare OTel

- **v2:** `cognitive.e4.audit.data-anonymize` (L6299).
- **Cod:** `cognitive:e4:audit:data:anonymize` (construit din primul argument `withCognitiveSpan`). **Reconciliere** cu catalog `e4:audit:data-anonymize` recomandată pentru atribute span.

---
*Revizuire manuală:* dovezi repo 2026-04-13.
