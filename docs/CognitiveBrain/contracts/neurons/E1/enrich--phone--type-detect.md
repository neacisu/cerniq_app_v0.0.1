<!-- neuron-contract:author-complete -->

# Neuron `enrich:phone:type-detect`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:phone:type-detect` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--phone--type-detect.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:phone:type-detect` (ToolNeuron, Non-AI). **La audit (2026-04-11)** nu există **`enrich:phone:type-detect`** în `queue-registry.ts`, `main.ts` (enrichment), nici intrare dedicată în `cognitive-node-catalog.ts`. **Tipul de linie (MOBILE vs FIXED)** apare însă ca **câmp în aceeași bucată de metadata** produsă de **`enrich:phone:carrier`**: `metadata.carrierDetection.phoneType` în `h3-carrier-detection.ts` (`detectCarrier` → `ROMANIAN_PREFIXES[].type`). Separat, **HLR** poate popula `metadata.hlrLookup.carrierType` din răspunsul API (`carrier_type` în `h2-hlr-lookup.ts` / `hlr-api-client.ts`). Concluzie: **nu există neuron/coadă E1 izolat** pentru «type-detect»; comportamentul este **împărțit / secundar** față de cozile `enrich:phone:carrier` și `enrich:phone:hlr`.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:phone:type-detect\`` (~L2347–2367).
- `packages/shared/src/cognitive-node-catalog.ts` — căutare `type-detect`: **lipsă**.
- `workers/shared/src/queue-registry.ts` — căutare `type-detect`: **lipsă**; există doar `enrich:phone:normalize` / `hlr` / `carrier` (~L57–59).
- `workers/enrichment/src/workers/h3-carrier-detection.ts` — `phoneType: detected.type` în `carrierDetection` (~L82–87, ~L94–95).
- `workers/enrichment/src/workers/h2-hlr-lookup.ts` — `carrierType: result?.carrier_type` în `hlrLookup` (~L63–73).
- `rg` repo — `enrich:phone:type-detect`: doar docs v2 + matrice + acest contract.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.phone.type-detect`.
- **Handler dedicat:** lipsă.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru `enrich:phone:type-detect`. Semnale: `e1:enrich:phone-carrier`, `e1:enrich:phone-hlr` (câmpuri `phoneType` / `carrierType`). | v2 coadă dedicată. | Fără `nodeKey` 1:1. |
| 2 | Etapă, familie, swimlane | Piese: E1, aceleași swimlane-uri ca phone carrier / HLR în catalog. | v2 E1 enrichment. | — |
| 3 | Rol declarat | Detectare tip linie ca sub-rezultat al carrier heuristic sau HLR. | v2 neuron distinct «type-detect». | Nu există scop izolat în cod. |
| 4 | NeuronType + SOFAI | Neuron v2: `ToolNeuron`; piese runtime: Tool/Procedural mix (HLR Tool, carrier Tool). | v2. | — |
| 5 | Criticitate | v2: `MEDIUM`. Catalog carrier: `LOW`; HLR: `MEDIUM`. | v2. | Criticitate amestecată pe căi parțiale. |
| 6 | Înveliș telemetrie | Fără span pentru `enrich:phone:type-detect`. Span-uri operaționale: `e1:enrich:phone-carrier`, `e1:enrich:phone-hlr`. | v2 span dedicat. | Gap telemetrie pentru numele v2. |
| 7 | Înveliș politică | Moștenit din H3/H2 (fără extensie dedicată). | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Aceleași ca H3/H2; fără strat suplimentar «type-detect». | ADR-0007. | — |
| 10 | Escaladare HITL | Fără neuron dedicat. | ADR-0008. | — |
| 11 | Micro-OODA | Nu există ciclu OODA separat; tipul e derivat în pașii carrier/HLR. | v2 OODA pentru coadă dedicată. | — |
| 12 | Tier + de-escaladare | Fără invariant dedicat. | v2 §2.2. | — |
| 13 | Stack | Aceleași straturi ca phone carrier + HLR. | v2. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.phone.type-detect` — **fără** implementare directă.
- **Cod:** telemetrie doar prin `e1:enrich:phone-carrier` și `e1:enrich:phone-hlr`.
- **Stare:** **gap** canonic v2 vs runtime; eventuală **fuziune documentată** la migrare registry.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
