<!-- neuron-contract:author-complete -->

# Neuron `oblio:proforma:create`

> **Status:** audit manual **2026-04-11**. **G39** construiește proformă din negociere în stare **CLOSING**, calculează subtotal/TVA 19%/total din `negotiationItems`, apelează `oblioClient.createProforma` (STUB), inserează `oblio_documents` `PROFORMA`, enfilează `negotiation:state:transition` → **PROFORMA_SENT**, lanț audit.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `oblio:proforma:create` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/oblio--proforma--create.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4969–4992): **MotorNeuron**, **HIGH**, creare proformă la închidere negociere, **Non-AI**, Tier 3. **Repo:** `g39-oblio-proforma-create.ts` — stare obligatorie `CLOSING` (`g39` L34–35, L76–80), items din DB (`g39` L82–102), produse pentru nume/SKU (`g39` L104–111), totaluri (`g39` L113–119), `createProforma` cu `clientCui`/`clientName` din `negotiation.leadId` (placeholder comentat «FAZA 13», `g39` L135–139), `INSERT PROFORMA` (`g39` L146–163), tranziție `PROFORMA_SENT` (`g39` L165–181), audit `PROFORMA_CREATED` (`g39` L183–218). **Înregistrare:** `main.ts` L221. **Registry:** `E3_OBLIO_PROFORMA_CREATE` (`queue-registry.ts` L272). **Teste:** `g-workers.test.ts` G39 (L314+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`oblio:proforma:create\`` (L4969–4992).
- `packages/shared/src/cognitive-node-catalog.ts` — L1851–1859.
- `workers/shared/src/queue-registry.ts` — L272.
- `workers/e3-ai-sales/src/main.ts` — L221.
- `workers/e3-ai-sales/src/workers/g39-oblio-proforma-create.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.ts` — `createProforma`.
- `workers/e3-ai-sales/src/__tests__/g-workers.test.ts` — G39.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4988); G39 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:oblio:proforma-create`**, **`oblio:proforma:create`** (`cognitive-node-catalog.ts` L1853–1854). | v2 (L4986). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1857). | v2 (L4972–4979). | — |
| 3 | Rol declarat | Proformă + tranziție + audit (`g39` L3–14, L146–218). | v2 interfațare API Oblio (L4983–4984). | CUI/client real: **placeholder** `leadId` (`g39` L137–138). |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1856). | v2 MotorNeuron (L4977). | — |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1859). | v2 HIGH (L4980). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2 `cognitive.e3.oblio.proforma-create` (L4991). | **Parțial aliniat**. |
| 7 | Înveliș politică | Validări stare + items non-goale (`g39` L59–102). | v2 Tier 3, HITL la anomalii (L4981, L4989). | Fără HITL explicit în G39. |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | `CLOSING`, items, TVA 19% fix (`g39` L34–35, L113–119). | ADR-0007 țintă. | TVA fix poate diverge de politici tenant. |
| 10 | Escaladare HITL | Nu în G39. | v2 politică HITL (L4989). | — |
| 11 | Micro-OODA | OBSERVE — negociere/items; ORIENT — reguli sume; DECIDE — throw vs create; ACT — stub + insert + tranziție + audit (`g39` L55–224). | v2 OODA (L4987). | — |
| 12 | Tier + de-escaladare | Fără praguri încredere în cod. | v2 Tier 3 (L4981). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, `oblioClient` STUB. | v2 §2.3. | Rate60/min menționat antet G39 L2 — verificare enforcement în cod = limită evidență. |

### Mapare OTel

- **v2:** `cognitive.e3.oblio.proforma-create`.
- **Cod:** `cognitive.nodeKey` **`e3:oblio:proforma-create`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
