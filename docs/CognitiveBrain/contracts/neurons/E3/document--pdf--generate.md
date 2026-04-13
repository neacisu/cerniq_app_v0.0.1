<!-- neuron-contract:author-complete -->

# Neuron `document:pdf:generate`

> **Status:** audit manual **2026-04-11**. **I51** nu „generează” PDF din Handlebars local; **descarcă** PDF-ul produs de **Oblio** (link semnat + fetch binar).

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `document:pdf:generate` |
| etapa | E3 |
| familie (v2) | `fiscal-docs` |
| contract_path | `contracts/neurons/E3/document--pdf--generate.md` |
| ADR familie (indicativ) | [fiscal-docs](../../adr/families/e3/fiscal-docs.md) |

## Scop în context real

**v2** (L4819–4842) și **catalog** (`cognitive-node-catalog.ts` L1967) descriu generare PDF din **template Handlebars** cu date negociere. **Repo:** `workers/e3-ai-sales/src/workers/i51-document-pdf-generate.ts` citește metadate din **`oblio_documents`** (Drizzle L52–65), obține link descărcare prin **`getDocumentDownloadLink`** Oblio (L77), apoi **`downloadDocumentPdf`** (L80); returnează `pdfBase64`, `fileName` derivat din serie/număr (L84–100). Comentariu explicit: Oblio generează documentul fiscal; workerul doar descarcă (L14–16). **Înregistrare:** `main.ts` L235. **Registry:** `QUEUES.E3_DOCUMENT_PDF_GENERATE` (`queue-registry.ts` L298, L998). **Teste:** `i-workers.test.ts` I51 (L525+ per antet fișier). **Downstream:** comentariu I51 — PDF pentru I52 email și I55 arhivare (L10–11).

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`document:pdf:generate\`` (L4819–4842).
- `packages/shared/src/cognitive-node-catalog.ts` — L1963–1972 (text catalog vs comportament: a se vedea rândul 3 din tabel).
- `workers/shared/src/queue-registry.ts` — L298, L998.
- `workers/e3-ai-sales/src/main.ts` — L235.
- `workers/e3-ai-sales/src/workers/i51-document-pdf-generate.ts`.
- `workers/e3-ai-sales/src/lib/oblio-client.js` — apeluri (citire la audit prin import în I51).
- `workers/e3-ai-sales/src/__tests__/i-workers.test.ts` — I51.
- `workers/shared/src/factory.ts`.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L4838); I51 fără LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **`e3:document:pdf-generate`**, coadă **`document:pdf:generate`** (`cognitive-node-catalog.ts` L1965–1966). `QUEUES.E3_DOCUMENT_PDF_GENERATE` (`queue-registry.ts` L298). | v2: același `Confirmed queue field` (L4836). | — |
| 2 | Etapă, familie, swimlane | E3; **`fiscal-execution`** (`cognitive-node-catalog.ts` L1969). | v2: fiscal-execution (L4829). | — |
| 3 | Rol declarat | Descărcare PDF Oblio + base64 (`i51` L1–17, L76–100). | v2: generare din Handlebars negociere (L4833–4835). | **Decalaj major:** sursa PDF este Oblio, nu template local I51. |
| 4 | NeuronType + SOFAI | **`MotorNeuron`** (`cognitive-node-catalog.ts` L1968). | v2: MotorNeuron (L4827). | — |
| 5 | Criticitate | **`HIGH`** (`cognitive-node-catalog.ts` L1971). | v2: HIGH (L4830). | — |
| 6 | Înveliș telemetrie | `createWorker` + `withCognitiveSpan`. | v2: `cognitive.e3.document.pdf-generate` (L4841). | **Parțial aliniat.** |
| 7 | Înveliș politică | Throw dacă document lipsă sau series/number goale (`i51` L63–72). | v2: Tier 3, HITL (L4831, L4839). | — |
| 8 | Rutare model (dacă AI) | **N/A** — vezi N/A. | v2: Non-AI. | — |
| 9 | Guardrails | Validare tenant + `oblioDocuments` row; tip document INVOICE/PROFORMA/CREDIT_NOTE (`i51` L74–75). | ADR-0007 — țintă. | — |
| 10 | Escaladare HITL | Nu în I51. | v2 / ADR-0008. | — |
| 11 | Micro-OODA | OBSERVE — job + DB; ORIENT — tip document; DECIDE — link; ACT — download PDF (`i51` L46–100). | v2 OODA generic (L4837). | ACT = integrare Oblio, nu „emitere” locală. |
| 12 | Tier + de-escaladare | Fără tier în cod. | v2 Tier 3 (L4831). | — |
| 13 | Stack (subset) | BullMQ, Drizzle, client Oblio (`getDocumentDownloadLink`, `downloadDocumentPdf`). | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.e3.document.pdf-generate`.
- **Cod:** `cognitive.nodeKey` **`e3:document:pdf-generate`** — **parțial aliniat**.

---
*Generator inițial:* înlocuit prin audit manual.
