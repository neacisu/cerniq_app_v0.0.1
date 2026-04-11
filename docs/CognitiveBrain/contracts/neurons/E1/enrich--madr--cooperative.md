<!-- neuron-contract:author-complete -->

# Neuron `enrich:madr:cooperative`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:madr:cooperative` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--madr--cooperative.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** înregistrează coada canonică `enrich:madr:cooperative` (ToolNeuron, Non-AI, «not yet reconciled with runtime registry»), cu etichetă semantică MADR. **În repo**, nu există apel la un API MADR în workerul E1 mapat acestei intenții: implementarea apropiată este **`agri:cooperative`**, procesor `cooperativeMembershipProcessor` — **inferență deterministă** din textul `metadata.apiaData.payload` (regex pentru «cooperativă», «membru cooperativ», «grup de producatori», «uniune de cooperative» etc.) și din `denumire` + domeniul `website`; rezultatul merge în `metadata.cooperativeMembership` pe `silverCompanies`, cu log `silverEnrichmentLog` (`source: cooperative_membership`, `operation: infer`). **Nu** este același lucru cu pipeline-ul **E5** `association:madr:scrape` (PDF ministerial → `goldAssociations`), care ține de registru MADR la nivel de catalog, nu de inferență per-companie silver. **Orchestratorul** `p1-orchestrate.ts` **nu** enfilează `agri:cooperative` la audit (2026-04-11); coada e înregistrată la worker și expusă ca runtime worker în API (`imports-bronze.ts`). Documentația `etapa1-workers-triggers.md` menționează lanț `agri:ouai` → `agri:cooperative`, dar **`l2-ouai-membership.ts` nu conține enqueue** către cooperative — posibil drift spec vs cod.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:madr:cooperative\`` (~L2215–2235).
- `packages/shared/src/cognitive-node-catalog.ts` — `e1:agri:cooperative` / `agri:cooperative` (~L800–807).
- `workers/shared/src/queue-registry.ts` — `AGRI_COOPERATIVE: "agri:cooperative"` (~L73), config concurență (~L742).
- `workers/enrichment/src/main.ts` — `"agri:cooperative": cooperativeMembershipProcessor` (~L158).
- `workers/enrichment/src/workers/l3-cooperative-membership.ts` — `withCognitiveSpan("e1:agri:cooperative", …)`, regex + `jsonb_set` `cooperativeMembership` (~L16–120).
- `workers/enrichment/src/workers/l2-ouai-membership.ts` — verificare: **fără** `agri:cooperative` (~L16–118).
- `workers/enrichment/src/workers/p1-orchestrate.ts` — verificare: **fără** `agri:cooperative` în fragment citit anterior (agri: apia, ouai separat în spec).
- `apps/api/src/routes/imports-bronze.ts` — `L3:cooperative-membership` + `QUEUES.AGRI_COOPERATIVE` (~L1976–1981).
- `workers/enrichment/src/workers/agri-workers.integration.test.ts` — export procesor (~L20–21).
- `workers/e5-nurturing/src/workers/g38-association-madr-scrape.ts` — context MADR PDF (comparare arhitecturală, ~L1–20, ~L134–136).

## Instanțe v2

- **Runtime E1 (mapare audit):** `nodeKey` **`e1:agri:cooperative`**, coadă **`agri:cooperative`**.
- **OTel span name (v2 plan):** `cognitive.enrich.madr.cooperative`
- **Evidence status (v2):** graph-export-grounded; reconciliere registry anunțată ca nefinalizată.

## N/A pe criterii

- **Rând 8:** **N/A** — v2 Non-AI; `l3-cooperative-membership.ts` fără apel LLM.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:madr:cooperative`; literal **lipsă** în registry. Runtime: **`agri:cooperative`**, catalog **`e1:agri:cooperative`**. | v2 vs catalog. | v2 §2.4 până la unificare nume. |
| 2 | Etapă, familie, swimlane | E1; swimlane catalog **`enrichment-external`**. | v2 E1 enrichment. | — |
| 3 | Rol declarat | Catalog: «Înregistrare date cooperative agricole». Cod: **inferă** apartenență semnal din APIA + nume/domeniu; **nu** interogare MADR. | v2 operational text (generic extern). | Denumire v2 «MADR» vs absență API MADR în E1. |
| 4 | NeuronType + SOFAI | Catalog: **`KnowledgeNeuron`**; v2: **`ToolNeuron`** — **neconcordanță**. | v2 §2.1. | Reconciliere tip catalog vs v2. |
| 5 | Criticitate | Catalog **`LOW`**; v2 **`MEDIUM`**. | v2. | — |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:agri:cooperative", …)`** (~L19–20). Span v2 `cognitive.enrich.madr.cooperative` ≠ string în cod. | ADR-0003. | Migrare denumiri. |
| 7 | Înveliș politică | Fără OPA în fișier; citire DB tenant + update metadata. | v2 tier 4. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Dacă `!company` → return `not_found` (~L40). | ADR-0007. | — |
| 10 | Escaladare HITL | Fără HITL în procesor. | ADR-0008. | — |
| 11 | Micro-OODA | Citește silver → derive semnale → persistă `cooperativeMembership` → log. | v2 OODA (API/cache — **nu** reflectat: fără apel HTTP MADR). | — |
| 12 | Tier + de-escaladare | Eroare: throw după log (~L104–116). | v2. | Fără test care simulează payload APIA real în repo la audit. |
| 13 | Stack v2 §2.3 (subset) | BullMQ, Postgres, Redis. | v2. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.madr.cooperative`.
- **Cod:** `withCognitiveSpan` — **`e1:agri:cooperative`** (`l3-cooperative-membership.ts`).
- **Stare:** **migrare planificată**.

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
