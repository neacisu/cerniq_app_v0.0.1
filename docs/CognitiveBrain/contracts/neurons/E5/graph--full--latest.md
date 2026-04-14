<!-- neuron-contract:author-complete -->

# Neuron `graph:full:latest`

> **Status:** audit manual **2026-04-13**. **v2** coadă `graph:full:latest` (L8432–8452). **Cod:** **fără** acest literal în `queue-registry.ts` sau în `*.ts`. Artefacte graf (fișiere JSON pentru Leiden etc.) sunt produse în D20/D21/D24 — **fără** coadă „read latest” în registry citit. **Bootstrap:** D20–D24 **nu** în `index.ts` L68–91.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `graph:full:latest` |
| etapa | E5 |
| familie (v2) | `graph-community` |
| contract_path | `contracts/neurons/E5/graph--full--latest.md` |
| ADR familie (indicativ) | [graph-community](../../adr/families/e5/graph-community.md) |

## Scop în context real

**v2:** acces la ultima versiune de graf complet. **Runtime:** **gap** nume; livrarea „latest” poate fi pattern intern (path temporar, job data), **nu** coadă BullMQ cu acest nume.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — (L8432–8452).
- `workers/shared/src/queue-registry.ts` — L555–563; **fără** `graph:full:latest`.
- `rg` `graph:full:latest` în `*.ts`: **fără**.

## Instanțe v2

- —

## N/A pe criterii

- **8 — Rutare model:** N/A — v2 Non-AI (L8448).

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Fără** coadă. | v2 L8446. | — |
| 2 | Etapă, familie, swimlane | — | v2 E5 / `graph-community` (L8434–8435). | — |
| 3 | Rol declarat | — | v2 generic (L8443–8445). | — |
| 4 | NeuronType + SOFAI | — | v2 `KnowledgeNeuron` (L8439). | — |
| 5 | Criticitate | — | v2 `MEDIUM` (L8441). | — |
| 6 | Înveliș telemetrie | — | v2 `cognitive.graph.full.latest` (L8451). | — |
| 7 | Înveliș politică | — | v2 L8449–8450. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | NeMo destinație. | — |
| 10 | Escaladare HITL | — | v2 L8450. | — |
| 11 | Micro-OODA | — | v2 L8447. | — |
| 12 | Tier + de-escaladare | — | Tier 4 (L8442). | — |
| 13 | Stack v2 §2.3 (subset) | — | — | — |

### Mapare OTel

- **v2:** `cognitive.graph.full.latest`.
- **Cod:** fără span verificat.

---
*Audit manual 2026-04-13; surse verificate în repo.*
