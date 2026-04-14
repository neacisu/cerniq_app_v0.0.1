<!-- neuron-contract:author-complete -->

# Neuron `webhook:revolut:ingest`

> **Status:** audit manual **2026-04-13**. **Ordinea cuvintelor:** graf v2 `webhook:revolut:ingest` ≠ coadă runtime **`revolut:webhook:ingest`** (A1). **Tip neuron:** catalog = `PerceptionNeuron` (HIGH); v2 graf L6421–6441 inferă `ReconciliationNeuron` / MEDIUM — **contradicție documentată**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `webhook:revolut:ingest` |
| coadă runtime | `revolut:webhook:ingest` |
| etapa | E4 |
| familie (v2) | `cash` |
| contract_path | `contracts/neurons/E4/webhook--revolut--ingest.md` |
| ADR familie (indicativ) | [cash](../../adr/families/e4/cash.md) |

## Scop în context real

Ingestie webhook Revolut: idempotency Redis `SET NX EX 86400` pe `eventId`, INSERT `revolut_webhooks_raw`, enqueue paralel `revolut:transaction:process` (A2) și `revolut:webhook:validate` (A6). Redis indisponibil → throw pentru retry BullMQ.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6421–6441 (evidence graph-export L6441).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:revolut:webhook-ingest` / `revolut:webhook:ingest` (~L2236–2243).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — `E4_REVOLUT_WEBHOOK_INGEST` (~L355).
- Handler: [`a1-revolut-webhook-ingest.ts`](../../../../../workers/e4-postsale/src/workers/a1-revolut-webhook-ingest.ts) — `createA1Processor`.
- Bootstrap: [`workers/e4-postsale/src/index.ts`](../../../../../workers/e4-postsale/src/index.ts) — A1 ~L134–174 (zonă worker).
- Teste: [`workers/e4-postsale/src/__tests__/a-workers.test.ts`](../../../../../workers/e4-postsale/src/__tests__/a-workers.test.ts) — suite A1.
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `cash` (v2 L6421–6441)

- **Confirmed queue field (graf):** `webhook:revolut:ingest`
- **Neuron type (v2 inferat):** `ReconciliationNeuron` — **nu** se regăsește în catalog
- **Criticitate (v2 inferat):** MEDIUM
- **OTel (v2):** `cognitive.webhook.revolut.ingest`
- **Evidence status:** graph-export + architecture-enhanced (L6441)

### Reconciliere cu catalog (sursă autoritară runtime)

- **nodeKey:** `e4:revolut:webhook-ingest`
- **Neuron type:** `PerceptionNeuron`
- **Criticitate:** `HIGH`
- **OTel (catalog):** `cognitive.e4.revolut.webhook-ingest` (convenție puncte din plan neuronilor catalog-grounded)

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Runtime + catalog: `revolut:webhook:ingest`. Graf v2: `webhook:revolut:ingest`. | v2 L6435. | Două convenții de denumire pentru aceeași capabilitate. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `payment-processing`. | v2: E4, `cash`. | — |
| 3 | Rol declarat | A1: idempotency + persist + enqueue A2/A6 (fișier ~L4–10, ~L46–100). | v2 L6432–6434 (descriere generică în graf). | v2 descrie potrivire facturi — **nu** reflectă A1; prioritate cod. |
| 4 | NeuronType + SOFAI | `PerceptionNeuron` în catalog. | v2 L6428 — ReconciliationNeuron inferat. | **Contradicție tip** graf vs catalog. |
| 5 | Criticitate | `HIGH` în catalog (~L2243). | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | Metrică `e4RevolutWebhooksTotal` (A1 ~L62, L104); fără `withCognitiveSpan` în A1. | v2 L6439 — metrică generică. | Span `cognitive.webhook.revolut.ingest` neimplementat ca atare. |
| 7 | Înveliș politică | Idempotency strict pe `eventId` (A1 ~L46–64). | v2 L6438 — fără HITL obligatoriu. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Validare HMAC în A6 separat; A1 păstrează `rawBody` + `signature`. | — | — |
| 10 | Escaladare HITL | Nu în A1; erori Redis → retry. | — | — |
| 11 | Micro-OODA | Ingest → persist → fan-out cozi (A1). | v2 OODA L6436 (generic reconciliere) — **depărtare semantică** față de cod. | OODA v2 pentru acest bloc nu descrie A1 fidel. |
| 12 | Tier + de-escaladare | Fără prag încredere în A1. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Redis (idempotency), Postgres `revolut_webhooks_raw`. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.webhook.revolut.ingest`.
- **Catalog — destinație aliniată cod:** span `cognitive:e4:revolut:webhook-ingest` (pattern `cognitive:${nodeKey}` cu `nodeKey` din catalog cu cratimă).
- **Cod A1:** fără `withCognitiveSpan`; atribute `cognitive.nodeKey` din helper **neaplicate** pe acest processor.

---
*Audit manual 2026-04-13.*
