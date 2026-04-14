<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:company-base`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:company-base` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--company-base.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:termene:company-base` (ToolNeuron, Non-AI). **La audit în repo:** **nu** există `enrich:termene:company-base` în `queue-registry.ts`, `main.ts`, `p1-orchestrate.ts` sau `cognitive-node-catalog.ts`. Clientul `termene-api-client.ts` expune **doar** patru apeluri după CUI: `bilant`, `scor-risc`, `dosare`, `actionari` — **fără** endpoint «company base» / profil firmă Termene. **ADR familie** notează explicit cozile Termene ca `balance`, `risk`, `dosare`, `actionari` (`enrichment.md` ~L25). Date de bază companie pot fi completate din **alte surse** (ex. ANAF, ONRC) în alte neuroni; **acest** `v2_queue` **nu** are handler dedicat Termene.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:company-base\`` (~L2435–2454).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `company-base` / `termene:company`: **fără** potrivire; doar cele 4 cozi Termene (~L524–560).
- `workers/shared/src/queue-registry.ts` — **fără** `company-base` (~L44–47).
- `workers/enrichment/src/main.ts` — **fără** procesor (~L129–132).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — **fără** (~L111–114).
- `workers/enrichment/src/lib/termene-api-client.ts` — fără funcție company-base (~L159–173).
- `docs/CognitiveBrain/adr/families/e1/enrichment.md` — lista Termene (~L25).
- `rg` `company-base` în `*.ts` din repo (excludere docs): **fără** potrivire la audit.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.company-base`.
- **Runtime:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** complet: fără `nodeKey`, fără coadă pentru `enrich:termene:company-base`. | v2 canonic. | Implementare lipsă. |
| 2 | Etapă, familie, swimlane | v2: E1 enrichment. Cod: neinstanțiat. | v2. | — |
| 3 | Rol declarat | v2: enrichment extern generic. Cod: — | v2. | — |
| 4 | NeuronType + SOFAI | v2: `ToolNeuron`. Cod: — | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Cod: neaplicabil. | v2. | — |
| 6 | Înveliș telemetrie | Fără `withCognitiveSpan` pentru acest queue. | ADR-0003. | Doar destinație v2. |
| 7 | Înveliș politică | — | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | — | ADR-0007. | — |
| 10 | Escaladare HITL | — | ADR-0008. | — |
| 11 | Micro-OODA | — | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | — | v2 §2.2. | — |
| 13 | Stack | — | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.company-base`.
- **Cod:** **lipsă**.
- **Stare:** **gap** implementare.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
