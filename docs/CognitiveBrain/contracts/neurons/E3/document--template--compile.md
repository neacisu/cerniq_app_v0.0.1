<!-- neuron-contract:author-complete -->

# Neuron `document:template:compile`

> **Status:** audit manual **2026-04-11**. **I54** compilează template-uri **Handlebars inline** (registry în cod), fără LLM — aliniat cu „deterministic” din antetul fișierului; comentariul `MaintenanceNeuron` din I54 este **învechit** față de catalog (**ProceduralNeuron**).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `document:template:compile` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/document--template--compile.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4844–4867): **ProceduralNeuron**, **MEDIUM**, compilare template Handlebars cu date negociere/factură, **Non-AI**. **Repo:** `workers/e3-ai-sales/src/workers/i54-document-template-compile.ts` — template-uri HTML mari definite în fișier (`INVOICE_TEMPLATE_RO`, `PROFORMA_TEMPLATE_RO`, …), `TEMPLATE_REGISTRY` mapare `templateName` → string (`i54` L306–345), `Handlebars.compile` + `templateVariables` (`i54` L336–337), helper `inc` (L302). Necunoscut `templateName` → throw cu listă disponibilă (`i54` L328–334). **Înregistrare:** `main.ts` L238. **Registry:** `QUEUES.E3_DOCUMENT_TEMPLATE_COMPILE` (`queue-registry.ts` L301, L1001). **Catalog:** `e3:document:template-compile`, **ProceduralNeuron** (`cognitive-node-catalog.ts` L1991–1998). **Teste:** `i-workers.test.ts` I54 (L246+).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`document:template:compile\`` (L4844–4867).
- `packages/shared/src/cognitive-node-catalog.ts` — L1991–1998.
- `workers/shared/src/queue-registry.ts` — L301, L1001.
- `workers/e3-ai-sales/src/main.ts` — L238.
- `workers/e3-ai-sales/src/workers/i54-document-template-compile.ts`.
- `workers/e3-ai-sales/src/__tests__/i-workers.test.ts` — I54.
- `workers/shared/src/factory.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4863); I54 fără LLM (L6–7).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:document:template-compile`**, coadă **`document:template:compile`** (`cognitive-node-catalog.ts` L1992–1993). `QUEUES.E3_DOCUMENT_TEMPLATE_COMPILE` (`queue-registry.ts` L301). | v2: același `Confirmed queue field` (L4861). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1995). | v2: fiscal-execution (L4854). | — |
| 3 | Rol declarat | Compilare HTML din registry Handlebars (`i54` L1–10, L306–345). | v2: compilare pentru PDF (L4858–4860). | Template-uri **inline**, nu din DB/FS (explicit L5–6). |
| 4 | NeuronType + SOFAI | **`ProceduralNeuron`** (`cognitive-node-catalog.ts` L1994). | v2: ProceduralNeuron (L4852). | Antet I54 spune „MaintenanceNeuron” (L8) — **contradicție față de catalog/v2**. |
| 5 | Criticitate | **`MEDIUM`** (`cognitive-node-catalog.ts` L1997). | v2: MEDIUM (L4855). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2: `cognitive.e3.document.template-compile` (L4866). | **Parțial aliniat.** |
| 7 | Înveliș politică | Throw pe template necunoscut (`i54` L329–334). | v2: Tier 4, HITL la eșecuri repetate (L4856, L4864). | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | Registru finit de nume + Handlebars strict. | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Nu în I54. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — `templateName` + variabile; ORIENT — lookup registry; DECIDE — valid; ACT — emit HTML (`i54` L325–345). | v2 OODA transformare deterministă (L4862). | Aliniat. |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 4 (L4856). | — |
| 13 | Stack (subset) | BullMQ, Handlebars. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.document.template-compile`.
- **Cod:** `cognitive.nodeKey` **`e3:document:template-compile`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
