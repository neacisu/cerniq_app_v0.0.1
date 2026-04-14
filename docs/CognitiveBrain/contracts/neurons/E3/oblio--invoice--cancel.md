<!-- neuron-contract:author-complete -->

# Neuron `oblio:invoice:cancel`

> **Status:** audit manual **2026-04-11**. **G42** — două faze: fără `approvalRef` → coadă `hitl:escalate` cu callback la `oblio:invoice:cancel`; cu `approvalRef` → `oblioClient.cancelInvoice` (STUB), marchează factura `CANCELLED`, inserează `CREDIT_NOTE`, lanț `fiscal_audit_trail`.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `oblio:invoice:cancel` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/oblio--invoice--cancel.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4919–4942): **MotorNeuron**, **HIGH**, anulare factură Oblio, **Non-AI**, Tier 3, HITL la anomalii. **Repo:** `workers/e3-ai-sales/src/workers/g42-oblio-invoice-cancel.ts` — validare `INVOICE` + `ACTIVE` (`g42` L90–119); faza 1: `createQueue(QUEUES.HITL_ESCALATION)` + `callbackQueue: QUEUES.E3_OBLIO_INVOICE_CANCEL` (`g42` L52–79); faza 2: `oblioClient.cancelInvoice` (`g42` L121–122), `UPDATE` status `CANCELLED`, `INSERT` `CREDIT_NOTE` (`g42` L124–145), audit SHA-256 (`g42` L149–183). **Înregistrare:** `main.ts` L224. **Registry:** `E3_OBLIO_INVOICE_CANCEL` (`queue-registry.ts` L275). **Client Oblio:** `cancelInvoice` este **STUB** (`oblio-client.ts` L179–189). **Teste:** `g-workers.test.ts` — `G42` (L856+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`oblio:invoice:cancel\`` (L4919–4942).
- `packages/shared/src/cognitive-node-catalog.ts` — L1879–1886.
- `workers/shared/src/queue-registry.ts` — L275.
- `workers/e3-ai-sales/src/main.ts` — L224.
- `workers/e3-ai-sales/src/workers/g42-oblio-invoice-cancel.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.ts` — `cancelInvoice`.
- `workers/e3-ai-sales/src/__tests__/g-workers.test.ts` — G42.
- `workers/shared/src/factory.ts` (înveliș worker).

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4938); G42 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:oblio:invoice-cancel`**, coadă **`oblio:invoice:cancel`** (`cognitive-node-catalog.ts` L1880–1881). | v2 același câmp coadă (L4936). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1884). | v2 fiscal-docs / swimlane fiscal-execution (L4922–4929). | — |
| 3 | Rol declarat | Anulare + notă credit + audit; HITL înainte de execuție (`g42` L6–14, L52–86, L121–183). | v2: anulare la abandon/stornare (L4933–4934). | — |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1883). | v2 MotorNeuron (L4927). | Clasificare SOFAI raportată ca în v2 §2.1. |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1886). | v2 HIGH (L4930). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan` (fabrică partajată). | v2: `cognitive.e3.oblio.invoice-cancel` (L4941). | **Parțial aliniat** — `cognitive.nodeKey` vs span v2. |
| 7 | Înveliș politică | HITL obligatoriu faza 1; fără `approvalRef` nu se apelează Oblio (`g42` L52–86). | v2 Tier 3, HITL la anomalii (L4931–4939). | Implementarea cere HITL **întotdeauna** înainte de cancel — mai strict decât «on anomaly» din v2. |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2 Non-AI. | — |
| 9 | Guardrails | Verificări `documentType` / `status`; constrângeri menționate în antet (`g42` L10–14, L112–118). | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | `hitl:escalate` + `type: invoice_cancel_approval` + callback (`g42` L54–74). | ADR-0008; v2 politică HITL (L4939). | Comportamentul callback-ului după aprobare (cine re-enqueue cu `approvalRef`) = în afara fișierului G42. |
| 11 | Micro-OODA | OBSERVE — job + DB invoice; ORIENT — faze approval; DECIDE — pending vs exec; ACT — API stub + DB + audit (`g42` L47–189). | v2 OODA send/execute (L4937). | — |
| 12 | Tier + de-escaladare | Fără praguri «confidence» în cod. | v2 Tier 3 (L4931). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `node:crypto`, `oblioClient` STUB. | v2 §2.3. | Apel HTTP real Oblio: **FAZA 13** per `oblio-client.ts` L12–13. |

### Mapare OTel

- **v2:** `cognitive.e3.oblio.invoice-cancel`.
- **Cod:** `cognitive.nodeKey` **`e3:oblio:invoice-cancel`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
