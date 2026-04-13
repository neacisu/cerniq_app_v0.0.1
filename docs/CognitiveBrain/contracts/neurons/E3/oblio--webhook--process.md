<!-- neuron-contract:author-complete -->

# Neuron `oblio:webhook:process`

> **Status:** audit manual **2026-04-11**. **G45** actualizează `oblio_documents.status` după `eventType` (mapare `payment_received`→`PAID`, `document_cancelled`→`CANCELLED`, `document_issued`→`ACTIVE`), cu idempotență pe `oblioId` și stări terminale; scrie `fiscal_audit_trail`. **Nu** apelează `oblioClient.processWebhookEvent` — logica e locală în worker; metoda din client rămâne STUB nefolosită de G45.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `oblio:webhook:process` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/oblio--webhook--process.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L5019–5042): **SensoryNeuron**, **MEDIUM**, procesare webhook Oblio, **Non-AI**, Tier 4, OODA ingest → enqueue downstream. **Repo:** `g45-oblio-webhook-process.ts` — lookup după `oblioId` (`g45` L63–77), skip dacă `CANCELLED`/`PAID` (`g45` L81–87, L32), mapare eveniment (`g45` L48–53, L89–94), `UPDATE` status (`g45` L96–100), audit (`g45` L102–133). **Înregistrare:** `main.ts` L227. **Registry:** `E3_OBLIO_WEBHOOK_PROCESS` (`queue-registry.ts` L278). **Teste:** `g-workers.test.ts` G45 (L1175+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`oblio:webhook:process\`` (L5019–5042).
- `packages/shared/src/cognitive-node-catalog.ts` — L1906–1913.
- `workers/shared/src/queue-registry.ts` — L278.
- `workers/e3-ai-sales/src/main.ts` — L227.
- `workers/e3-ai-sales/src/workers/g45-oblio-webhook-process.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.ts` — `processWebhookEvent` (neapelat din G45).
- `workers/e3-ai-sales/src/__tests__/g-workers.test.ts` — G45.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L5037); G45 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:oblio:webhook-process`**, **`oblio:webhook:process`** (`cognitive-node-catalog.ts` L1907–1908). | v2 (L5036). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1911). | v2 (L5022–5029). | — |
| 3 | Rol declarat | Reconciliere stare document din evenimente externe + audit (`g45` L4–17, L55–139). | v2 actualizare status (L5033–5034). | — |
| 4 | NeuronType + SOFAI | **`SensoryNeuron`** (`cognitive-node-catalog.ts` L1910). | v2 SensoryNeuron (L5027). | — |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L1913). | v2 MEDIUM (L5030). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.oblio.webhook-process` (L5041). | **Parțial aliniat**. |
| 7 | Înveliș politică | Idempotență explicită (`g45` L14–16, L81–87). | v2 Tier 4 (L5031). | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Evenimente necunoscute → `processed: false` (`g45` L89–94). | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în G45. | v2 (L5038). | — |
| 11 | Micro-OODA | OBSERVE — job webhook; ORIENT — document + terminal; DECIDE — skip/update; ACT — DB + audit (`g45` L55–139). | v2 ACT: enqueue downstream (L5037). | **Divergență:** G45 nu enfilează alt worker; actualizează direct DB. |
| 12 | Tier + de-escaladare | Fără în cod. | v2 Tier 4 (L5031). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `node:crypto`. | v2 §2.3. | Intrare HTTP webhook → job BullMQ: **în afara** G45. |

### Mapare OTel

- **v2:** `cognitive.e3.oblio.webhook-process`.
- **Cod:** `cognitive.nodeKey` **`e3:oblio:webhook-process`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
