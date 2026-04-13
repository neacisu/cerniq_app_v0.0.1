<!-- neuron-contract:author-complete -->

# Neuron `alert:internal:compliance-issue`

> **Status:** audit manual **2026-04-13**. **v2** definește coadă granulară `alert:internal:compliance-issue` (`AlertNeuron`, E4). **Repo:** **nu** există literal `alert:internal:compliance-issue` în `queue-registry.ts`, `cognitive-node-catalog.ts` sau `workers/**/*.{ts,tsx}` (căutare `rg`). **Există** infrastructură generică I39–I44: cozi `alert:payment` … `alert:dispatch` cu `createAlertProcessor` în `i-alert-workers.ts` și `createWorker` în `index.ts` — **fără** coadă dedicată sau mapare explicită către acest nume v2.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:internal:compliance-issue` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--internal--compliance-issue.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L6057–L6076): alertă internă, `AlertNeuron`, Tier 3, OODA cu decizie canal + urgență și țintă OTel `cognitive.alert.internal.compliance-issue`. **Repo:** procesorii I39–I44 loghează în `gold_audit_logs_etapa4`, incrementează `e4AlertsDispatchedTotal`; comentariu sursă: alertele sunt „internal” în faza curentă și **nu** se inventează canale WA/email/SMS (`i-alert-workers.ts` L14–17). Nu s-a găsit enqueue care să folosească exact `alert:internal:compliance-issue` ca nume de coadă BullMQ.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`alert:internal:compliance-issue\`` (L6057–L6076).
- `workers/shared/src/queue-registry.ts` — `E4_ALERT_PAYMENT` … `E4_ALERT_DISPATCH` (L462–473); **fără** `alert:internal:compliance-issue`.
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:alert:payment` … `e4:alert:dispatch` (L2593–2647); **fără** intrare pentru coada granulară.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — `createAlertProcessor`, export procesori I39–I44 (L62–170).
- `workers/e4-postsale/src/index.ts` — `createWorker` pentru `QUEUES.E4_ALERT_*` (L460–496).
- `workers/shared/src/cognitive-helpers.ts` — `startActiveSpan(\`cognitive:${nodeKey}\`)` (L226).
- Căutare `alert:internal:compliance-issue` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).
- Schema: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md). Checklist: [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI în blocul citit.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `alert:internal:compliance-issue`; cozi runtime `alert:payment` … `alert:dispatch`. | v2 **Confirmed queue field** L6071. | Granular v2 ≠ registry. |
| 2 | Etapă, familie, swimlane | Catalog `e4:alert:*`: swimlane `social-action` (ex. L2598–2599). | v2 familie `alerts`, exemplu metrică `swimlane="alerts"` (L6075). | Diferență swimlane metrică v2 vs catalog. |
| 3 | Rol declarat | Infrastructură alert generică (audit + metrică). | Alertă internă conformitate (v2). | — |
| 4 | NeuronType + SOFAI | `AlertNeuron` pentru cozile I39–I44; **fără** rând catalog pentru coada granulară. | v2 `AlertNeuron` L6064. | — |
| 5 | Criticitate | Neconectat la coadă dedicată. | `HIGH` (L6066). | — |
| 6 | Înveliș telemetrie | I39–I44: `withCognitiveSpan("e4:alert:payment", …)` etc. (`i-alert-workers.ts` L67, L140–170). | v2 OTel `cognitive.alert.internal.compliance-issue` (L6076). | **Fără** handler pentru coada granulară → span v2 neemis din codul citit. |
| 7 | Înveliș politică | Comentariu „internal” / fără canale externe (`i-alert-workers.ts` L14–17). | HITL / SLA v2 (L6074). | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI (L6073). | — |
| 9 | Guardrails | Inserare audit + metrică. | — | — |
| 10 | Escaladare HITL | Nu pentru această coadă nominală. | v2 SLA 4h (L6074). | — |
| 11 | Micro-OODA | Generic: log + metrică. | OODA v2 (L6072). | — |
| 12 | Tier + de-escaladare | — | Tier 3 (L6067). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4 (`index.ts`). | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.internal.compliance-issue` (L6076).
- **Cod:** pentru cozile implementate, span `cognitive:${nodeKey}` cu `nodeKey` = `e4:alert:payment` | … | `e4:alert:dispatch`. **Nu** există procesor pentru `alert:internal:compliance-issue`.

---
*Revizuire manuală:* înlocuiește generatorul/hidratarea automată; dovezi repo2026-04-13.
