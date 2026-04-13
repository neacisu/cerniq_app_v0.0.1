<!-- neuron-contract:author-complete -->

# Neuron `alert:client:delivery-failed`

> **Status:** audit manual **2026-04-13**. **v2** definește coadă granulară `alert:client:delivery-failed` (AlertNeuron, E4). **Repo:** **nu** există literal `alert:client:delivery-failed` în `queue-registry.ts`, `cognitive-node-catalog.ts` sau `workers/**/*.ts` (căutare `*.{ts,tsx,js,mjs}`). **Există** infrastructură generică E4 I39–I44: cozi `alert:payment`, `alert:delivery`, `alert:credit`, `alert:contract`, `alert:stock`, `alert:dispatch` cu procesori în `i-alert-workers.ts` și `createWorker` în `workers/e4-postsale/src/index.ts` — **fără** mapare explicită granulară → generic în codul citit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `alert:client:delivery-failed` |
| etapa | E4 |
| familie (v2) | `alerts` |
| contract_path | `contracts/neurons/E4/alert--client--delivery-failed.md` |
| ADR familie (indicativ) | [alerts](../../adr/families/e4/alerts.md) |

## Scop în context real

**v2** (L5925–L5945): alertă către client, `AlertNeuron` inferat, Tier 3, OODA cu dispatch WA/email/SMS în textul v2. **Repo:** fără coadă dedicată; procesorii I39–I44 apelează `createAlertProcessor` → `withCognitiveSpan` + insert `gold_audit_logs_etapa4` + `e4AlertsDispatchedTotal` (`i-alert-workers.ts` L62–133). Comentariu sursă: **fără** inventare canale externe; alertele sunt „internal” în faza curentă (L14–17). Contract evidence v2: *not yet reconciled with runtime registry* (L5945).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`alert:client:delivery-failed\`` (L5925–L5945).
- `workers/shared/src/queue-registry.ts` — `E4_ALERT_PAYMENT` … `E4_ALERT_DISPATCH` (L463–473); config worker concurrency (L1188–1198).
- `packages/shared/src/cognitive-node-catalog.ts` — `e4:alert:payment` … `e4:alert:dispatch` (L2593–2647); **fără** intrare `alert:client:delivery-failed`.
- `workers/e4-postsale/src/workers/i-alert-workers.ts` — `createAlertProcessor`, export `alertPaymentProcessor` … `alertDispatchProcessor` (L62–170).
- `workers/e4-postsale/src/index.ts` — `registerCognitiveWorkerEtapa(4)` (L30); import I39–I44 (L76–84); `createWorker` pentru `QUEUES.E4_ALERT_*` (L462–496).
- `workers/shared/src/cognitive-helpers.ts` — `withCognitiveSpan`: nume span = prefix literal **cognitive:** concatenat cu primul argument (L226); în I39-I44 acel argument este `e4:alert:payment` … `e4:alert:dispatch` (`i-alert-workers.ts` L67, L140–170).
- `workers/e4-postsale/src/__tests__/fhijk-workers.test.ts` — suite I39–I44 (L613+).
- Căutare `alert:client:delivery-failed` în `*.{ts,tsx,js,mjs}` — **0** rezultate (2026-04-13).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI în blocul citit.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `alert:client:delivery-failed`; cozi generice `alert:*` cu `nodeKey` `e4:alert:…` în catalog. | v2 **Confirmed queue field** în L5925–L5945. | Granular v2 ≠ cozi runtime înregistrate. |
| 2 | Etapă, familie, swimlane | Catalog `e4:alert:*`: swimlane **`social-action`** (ex. L2598–2599). | v2: familie `alerts`, metrică `swimlane="alerts"` (L5943). | v2 folosește swimlane `alerts` în exemplu Prometheus; catalog folosește `social-action` pentru cozile `alert:*` implementate. |
| 3 | Rol declarat | Infrastructură alert generică (audit + metrică); **fără** trigger dedicat pentru `alert:client:delivery-failed`. | Scop alertă client (v2). | — |
| 4 | NeuronType + SOFAI | `AlertNeuron` pentru cozile generice (v2/plan I39–I44); **fără** intrare pentru `alert:client:delivery-failed`. | v2 `AlertNeuron` inferat. | — |
| 5 | Criticitate | Neconectat pentru coada granulară. | `HIGH` în v2 (L5925–L5945). | — |
| 6 | Înveliș telemetrie | I39–I44: `withCognitiveSpan("e4:alert:payment", …)` etc. (`i-alert-workers.ts` L67, L140–170) → span activ `cognitive:e4:alert:payment` … `cognitive:e4:alert:dispatch` (prefix din `cognitive-helpers.ts` L226). | v2 OTel `cognitive.alert.client.delivery-failed` (L5944). | **Fără** procesor pentru coada granulară → **fără** span dedicat în cod; doar țintă v2. |
| 7 | Înveliș politică | Comentariu: alerte „internal” în fază curentă (i-alert-workers L16). | HITL v2 în L5925–L5945. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Inserare audit deterministă. | — | — |
| 10 | Escaladare HITL | Nu în i-alert-workers pentru granular. | v2 SLA4h etc. | — |
| 11 | Micro-OODA | Generic: log + metrică. | OODA notificare v2. | Canale WA/email: **nu** implementate în sursa citită. |
| 12 | Tier + de-escaladare | — | Tier 3 (v2). | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ E4 Redis DB4 (index.ts). | — | — |

### Mapare OTel

- **v2:** `cognitive.alert.client.delivery-failed` (L5944).
- **Cod:** pentru cozile implementate, span `cognitive:${nodeKey}` cu `nodeKey` = `e4:alert:payment` | … | `e4:alert:dispatch`. **Nu** există handler pentru `alert:client:delivery-failed`.

---
*Generator inițial:* înlocuit prin audit manual.
