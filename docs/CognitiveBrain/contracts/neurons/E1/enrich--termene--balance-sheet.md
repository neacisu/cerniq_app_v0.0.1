<!-- neuron-contract:author-complete -->

# Neuron `enrich:termene:balance-sheet`

> **Status:** audit manual **2026-04-11**.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:termene:balance-sheet` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--termene--balance-sheet.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** definește coada canonică `enrich:termene:balance-sheet` (ToolNeuron, Non-AI, span `cognitive.enrich.termene.balance-sheet`). **În runtime**, nu există acest literal în registry: Termene este implementat ca **`enrich:termene:balance`** cu `nodeKey` **`e1:enrich:termene-balance`**. Procesorul `termeneBalanceProcessor` (`e1-termene-balance.ts`) apelează `getTermeneBalance` → API Termene `/firme/{cui}/bilant`, persistă `cifraAfaceri`, `profitNet`, `numarAngajati` și `metadata.termeneBalance`. **Concluzie:** neuronul v2 «balance-sheet» este **acoperit semantic** de coada **`enrich:termene:balance`**, cu **diferență de nume** față de v2 §6.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:termene:balance-sheet\`` (~L2413–2432).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:enrich:termene-balance` / `enrich:termene:balance` (~L524–532).
- `workers/shared/src/queue-registry.ts` — `ENRICH_TERMENE_BALANCE` (~L44).
- `workers/enrichment/src/main.ts` — procesor `"enrich:termene:balance"` (~L129).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — aceeași coadă în orchestrare (~L111).
- `workers/enrichment/src/lib/termene-api-client.ts` — `getTermeneBalance` → `/bilant` (~L159–161).
- `workers/enrichment/src/workers/e1-termene-balance.ts` — `withCognitiveSpan("e1:enrich:termene-balance", …)` (~L20–23); mapare câmpuri (~L82–104).
- `workers/enrichment/src/lib/termene-api-client.test.ts` — test client bilant (~L39–51).
- `workers/enrichment/src/workers/sprint2.integration.test.ts` — `termeneBalanceProcessor` (~L325–333).
- `rg` literal `enrich:termene:balance-sheet` — v2 + contracte + specificații arhivă; **fără** queue runtime.

## Instanțe v2

- **OTel v2:** `cognitive.enrich.termene.balance-sheet`.
- **OTel cod:** `e1:enrich:termene-balance` (nu echivalent literal cu span-ul v2).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **Gap** pentru literal `enrich:termene:balance-sheet`. Implementare: `e1:enrich:termene-balance` ↔ `enrich:termene:balance`. | v2 queue balance-sheet. | Nume v2 ≠ registry. |
| 2 | Etapă, familie, swimlane | Catalog: etapa 1, `enrichment-external`. | v2 E1 enrichment. | — |
| 3 | Rol declarat | «Extragere bilanț contabil de la Termene.ro» (catalog); handler mapează cifra afaceri, profit net, angajați. | v2 analogie premotor. | Detaliu JSON bilant complet în afara acestui audit. |
| 4 | NeuronType + SOFAI | `ToolNeuron`. | v2 ToolNeuron. | — |
| 5 | Criticitate | Catalog `HIGH`; v2 `MEDIUM`. | v2. | Divergență. |
| 6 | Înveliș telemetrie | Span `e1:enrich:termene-balance` vs v2 `cognitive.enrich.termene.balance-sheet`. | ADR-0003. | Nealinat literal. |
| 7 | Înveliș politică | `callExternalApi`, fără HITL în handler. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A** | v2 Non-AI. | — |
| 9 | Guardrails | Validare CUI, logging erori Termene. | ADR-0007. | — |
| 10 | Escaladare HITL | Fără `human:*` în handler. | ADR-0008. | — |
| 11 | Micro-OODA | Request → API bilant → update `silver_companies`. | v2 OODA generic. | — |
| 12 | Tier + de-escaladare | Fără prag încredere în handler. | v2 §2.2. | — |
| 13 | Stack | BullMQ, HTTP Termene, Postgres. | v2 §2.3. | — |

### Mapare OTel

- **v2:** `cognitive.enrich.termene.balance-sheet`.
- **Cod:** `e1:enrich:termene-balance`.
- **Stare:** **nealinat** (nume span); aliniere planificată în fază 2 (v2 §6).

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
