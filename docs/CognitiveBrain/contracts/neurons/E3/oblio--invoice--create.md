<!-- neuron-contract:author-complete -->

# Neuron `oblio:invoice:create`

> **Status:** audit manual **2026-04-11**. **G41** convertește proformă `PROFORMA`+`ACTIVE` în rând `INVOICE`, marchează proforma `REPLACED`, enfilează `negotiation:state:transition` → `INVOICED`, scrie `fiscal_audit_trail`. Antetul G41 menționează enfileuire `einvoice:spv:send` (H46) — **lipsește în corpul procesorului** la audit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `oblio:invoice:create` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/oblio--invoice--create.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4944–4967): **MotorNeuron**, **CRITICAL**, emitere factură finală, **Non-AI**, Tier 2, HITL obligatoriu acțiuni ireversibile. **Repo:** `g41-oblio-invoice-create.ts` — încarcă proforma (`g41` L52–80), `oblioClient.convertProformaToInvoice` **STUB** (`g41` L83–84), `INSERT INVOICE` (`g41` L86–103), `UPDATE` proforma `REPLACED` (`g41` L105–109), `negotiation:state:transition` cu `toState: "INVOICED"` (`g41` L111–127), audit `INVOICE_CREATED` (`g41` L129–167). **Nu** există în G41 apel `createQueue` către `einvoice:send` — doar comentariu antet (`g41` L5–7) vs implementare. **Înregistrare:** `main.ts` L223. **Registry:** `E3_OBLIO_INVOICE_CREATE` (`queue-registry.ts` L274). **Teste:** `g-workers.test.ts` G41 (L674+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`oblio:invoice:create\`` (L4944–4967).
- `packages/shared/src/cognitive-node-catalog.ts` — L1870–1877.
- `workers/shared/src/queue-registry.ts` — L274.
- `workers/e3-ai-sales/src/main.ts` — L223.
- `workers/e3-ai-sales/src/workers/g41-oblio-invoice-create.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.ts` — `convertProformaToInvoice`.
- `workers/e3-ai-sales/src/__tests__/g-workers.test.ts` — G41.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4963); G41 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:oblio:invoice-create`**, **`oblio:invoice:create`** (`cognitive-node-catalog.ts` L1871–1872). | v2 (L4961). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1875). | v2 (L4947–4954). | — |
| 3 | Rol declarat | Conversie proformă → factură + tranziție negociere + audit (`g41` L3–12, L83–167). | v2 emitere după confirmare (L4958–4959). | Lanț SPV: **gap** față de comentariul G41 L5–7. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1874). | v2 MotorNeuron (L4952). | — |
| 5 | Criticitate | **`CRITICAL`** (`cognitive-node-catalog.ts` L1877). | v2 CRITICAL (L4955). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.oblio.invoice-create` (L4966). | **Parțial aliniat**. |
| 7 | Înveliș politică | Fără HITL explicit în G41 (flux direct după validări DB). | v2 Tier 2 + HITL obligatoriu ireversibil (L4956, L4964). | **Divergență:** v2 cere HITL; codul nu implementează această poartă în G41. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Doar `PROFORMA` + `ACTIVE` (`g41` L72–80). | ADR-0007 — destinație. | — |
| 10 | Escaladare HITL | Nu în G41. | v2 HITL mandatory (L4964). | Vezi rând 7. |
| 11 | Micro-OODA | OBSERVE — proformă; ORIENT — tip/stare; DECIDE — throw vs convert; ACT — stub API + DB + coadă tranziție + audit (`g41` L47–174). | v2 OODA send/execute (L4962). | — |
| 12 | Tier + de-escaladare | Fără praguri încredere în cod. | v2 Tier 2 (L4956). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `oblioClient` STUB. | v2 §2.3. | Trimitere automată SPV după factură: **neimplementată** în G41 la audit. |

### Mapare OTel

- **v2:** `cognitive.e3.oblio.invoice-create`.
- **Cod:** `cognitive.nodeKey` **`e3:oblio:invoice-create`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
