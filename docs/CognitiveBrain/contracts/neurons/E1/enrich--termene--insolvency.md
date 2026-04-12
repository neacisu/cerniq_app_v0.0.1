<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:insolvency`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:insolvency` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--insolvency.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește `enrich:termene:insolvency` (ToolNeuron, Non-AI, span `cognitive.enrich.termene.insolvency`). **Nu** există coadă sau procesor cu acest nume. **Semnal insolvență din Termene** este derivat **în** `e3-termene-dosare.ts`: din dosare active cu `tip_dosar`/`tip` care conțin «insolventa» sau «faliment» se setează `inInsolventa` și opțional `statusFirma: "INSOLVENTA"` (`~L59–78`). **Separat**, **ANAF** (nu Termene) furnizează `stare_insolv` agregat în `d0-anaf-full-fetch.ts` → `metadata.anafDatorii.stareInsolv` (`~L204–245`). **Concluzie:** neuronul v2 «insolvency» sub umbrela Termene **nu** este o unitate izolată; acoperire parțială prin **dosare Termene** + **date ANAF**; risc de **suprapunere semantică** cu `enrich:termene:anaf-debts` / ANAF.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:insolvency\`` (~L2501–2520).
- `packages/shared/src/cognitive-node-catalog.ts` — **fără** `enrich:termene:insolvency`; există `e1:enrich:termene-dosare` (~L543–550).
- `workers/shared/src/queue-registry.ts` — **fără** insolvency literal (~L44–47).
- `workers/enrichment/src/main.ts` — **fără** procesor insolvency (~L129–132).
- `workers/enrichment/src/workers/e3-termene-dosare.ts` — `inInsolventa`, `statusFirma` (~L59–78).
- `workers/enrichment/src/workers/d0-anaf-full-fetch.ts` — `stareInsolv` în `anafDatoriiSummary` (~L204–245).
- `rg` `enrich:termene:insolvency` în cod TS: **fără** (doar docs).

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.insolvency`.
- **Cod:** niciun span dedicat; logică împărțită între `e1:enrich:termene-dosare` și `e1:enrich:anaf-full-fetch`.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** `enrich:termene:insolvency`. Dovezi parțiale: `e1:enrich:termene-dosare`, `e1:enrich:anaf-full-fetch`. | v2 insolvency Termene. | Fără neuron unic. |
| 2 | Etapă, familie, swimlane | Dosare/ANAF: E1, catalog `enrichment-fiscal` / `enrichment-external` după neuron. | v2 E1. | — |
| 3 | Rol declarat | Inferență insolvență din dosare + câmp ANAF. | v2 generic enrichment. | — |
| 4 | NeuronType + SOFAI | ToolNeuron pe căile existente. | v2 ToolNeuron. | — |
| 5 | Criticitate | Dosare catalog `HIGH`; ANAF full `CRITICAL`; v2 `MEDIUM`. | v2. | Divergențe. |
| 6 | Înveliș telemetrie | Span-uri `e1:enrich:termene-dosare` / `e1:enrich:anaf-full-fetch`; **fără** span v2 insolvency. | ADR-0003. | Nealinat. |
| 7 | Înveliș politică | Politici per handler (fără HITL în citate). | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validări și logging în fiecare cale. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără în handler-ele citate. | ADR-0008. | — |
| 11 | Micro-OODA | Dosare: parse tipuri; ANAF: mapare câmpuri. | v2 OODA. | — |
| 12 | Tier + de-escaladare | Fără prag explicit. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP Termene/ANAF, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.insolvency`.
- **Cod:** **fără** span cu acest nume; logică în span-uri `e1:enrich:termene-dosare` și `e1:enrich:anaf-full-fetch`.
- **Stare:** **gap** canonic + **nealinat** telemetrie.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
