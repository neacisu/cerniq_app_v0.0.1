<!-- neuron-contract:author-complete -->

# Neuron `association:pdf:ingest`

> **Status:** audit manual **2026-04-13**. **v2** coadă `association:pdf:ingest` (L8253–8273). **Cod:** **fără** acest literal în `*.ts` / `*.tsx` (căutare `association:pdf:ingest`: zero). În E5 există neuron documentat separat **`bronze--ingest--pdf-extractor`** (alt contract); cozi **`association:*`** pentru scraping sunt G37–G42 (`ouai:scrape`, `madr:scrape`, `normalize`, `cui:lookup`, `member:match`, `coverage:update` — `queue-registry.ts` L592–602). **Bootstrap:** G37–G42 **nu** sunt în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `association:pdf:ingest` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/association--pdf--ingest.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md); [association-ingest](../../adr/families/e5/association-ingest.md) |

## Scop în context real

**v2:** ingest PDF în context graph-community. **Runtime:** **gap** nume exact; pipeline PDF bronze poate exista sub alt contract/nume de coadă — **nu** afirmăm echivalență fără fișier procesor citit aici.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8253–8273).
- `workers/shared/src/queue-registry.ts` — cozi `association:ouai:scrape` … `association:coverage:update` (L592–602); **fără** `association:pdf:ingest`.
- `workers/e5-nurturing/src/index.ts` — L68–L91.
- `rg` `association:pdf:ingest` în `*.ts`: **fără**.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8269).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă cu acest nume în registry. | v2 L8267. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 / `graph-community` (L8255–8256). | — |
| 3 | Rol declarat | — | v2 generic (L8264–8266). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8260). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8262). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.association.pdf.ingest` (L8272). | — |
| 7 | Înveliș politică | — | v2 L8270–8271. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo țintă. | — |
| 10 | Escaladare HITL | — | v2 L8271. | — |
| 11 | Micro-OODA | — | v2 L8268. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8263). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.association.pdf.ingest`.
- **Cod:** fără span cu acest nume găsit în TS.

---
*Audit manual 2026-04-13; surse verificate în repo.*
