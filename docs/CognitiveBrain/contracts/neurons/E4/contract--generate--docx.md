<!-- neuron-contract:author-complete -->

# Neuron `contract:generate:docx`

> **Status:** audit manual **2026-04-13**. Graf v2 `contract:generate:docx` → runtime **`contract:generate`** (G32). `withCognitiveSpan("e4:contract:generate", …)` este **aliniat** catalogului pentru acest pas.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue (graf) | `contract:generate:docx` |
| coadă runtime | `contract:generate` |
| etapa | E4 |
| familie (v2) | `contracts` |
| contract_path | `contracts/neurons/E4/contract--generate--docx.md` |
| ADR familie (indicativ) | [contracts](../../adr/families/e4/contracts.md) |

## Scop în context real

Generare contract: selectare template DOCX activ per `riskTier`, completare variabile, conversie PDF (LibreOffice headless), salvare locală, INSERT `gold_contracts` status `DRAFT`, enqueue G33 `contract:clauses:select`.

## Surse audit

- v2: [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — L6490–6510.
- ADR: [`adr/families/e4/contracts.md`](../../adr/families/e4/contracts.md).
- Catalog: [`cognitive-node-catalog.ts`](../../../../../packages/shared/src/cognitive-node-catalog.ts) — `e4:contract:generate` (~L2527–2534).
- Registry: [`queue-registry.ts`](../../../../../workers/shared/src/queue-registry.ts) — cozi G32 (~L423–426 zonă contracte).
- Handler: [`g32-contract-generate.ts`](../../../../../workers/e4-postsale/src/workers/g32-contract-generate.ts).
- Schema / checklist: [`../_CONTRACT_SCHEMA.md`](../_CONTRACT_SCHEMA.md), [`../CONTRACT_AUTHORING_CHECKLIST.md`](../CONTRACT_AUTHORING_CHECKLIST.md).

## Instanțe v2

### Instanță 1 — `contracts` (v2 L6490–6510)

- **Confirmed queue field:** `contract:generate:docx`
- **Evidence status:** graph-export (L6510)
- **OTel (v2):** `cognitive.contract.generate.docx`

## N/A pe criterii

- **8 — Rutare model:** N/A — Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | Coadă: `contract:generate`. `nodeKey`: `e4:contract:generate`. Graf: `contract:generate:docx`. | v2 L6504. | Denumire granulară docx în graf vs coadă agregată. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 4, `contract-execution`. | v2: E4, `contracts`. | — |
| 3 | Rol declarat | G32 antet: DOCX→PDF, template, `gold_contracts` DRAFT (~L1–13). | v2 L6502–6503. | — |
| 4 | NeuronType + SOFAI | `ContractNeuron`. | v2 inferat ContractNeuron. | — |
| 5 | Criticitate | `HIGH` în catalog (~L2534). | v2 inferat MEDIUM. | — |
| 6 | Înveliș telemetrie | `withCognitiveSpan("e4:contract:generate", …)` (G32 ~L45–46). Span: `cognitive:e4:contract:generate`. | v2 L6509 — metrică generică. | Span v2 `cognitive.contract.generate.docx` ≠ nume span din helper. |
| 7 | Înveliș politică | Timeout 30s menționat în antet G32. | v2 L6507. | — |
| 8 | Rutare model (dacă AI) | **N/A** | Non-AI. | — |
| 9 | Guardrails | Validare template activ + câmpuri obligatorii în fluxul G32. | — | — |
| 10 | Escaladare HITL | Nu în G32. | — | — |
| 11 | Micro-OODA | Template → PDF → persist → G33. | v2 OODA L6505. | — |
| 12 | Tier + de-escaladare | Fără prag încredere. | v2 Tier 4. | — |
| 13 | Stack v2 §2.3 (subset) | BullMQ, filesystem local `/LocalStorage/contracts/`, LibreOffice. | — | — |

### Mapare OTel

- **v2 (graf):** `cognitive.contract.generate.docx`.
- **Cod:** `cognitive:e4:contract:generate` prin `withCognitiveSpan` — aliniat catalogului `e4:contract:generate`.

---
*Audit manual 2026-04-13.*
