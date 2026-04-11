<!-- neuron-contract:author-complete -->

# Neuron `enrich:anif:ouai-lookup`

> **Status:** audit manual **2026-04-11**. Coloana «În cod (dovadă)» completată din v2 §6 + fișiere citate; markerul blochează regenerarea accidentală.

## Metadata

| Câmp | Valoare |
| --- | --- |
| v2_queue | `enrich:anif:ouai-lookup` |
| etapa | E1 |
| familie (v2, prima instanță) | `enrichment` |
| contract_path | `contracts/neurons/E1/enrich--anif--ouai-lookup.md` |
| ADR familie (indicativ) | [enrichment](../../adr/families/e1/enrichment.md) |

## Scop în context real

**v2** descrie coada canonică `enrich:anif:ouai-lookup` ca neuron ToolNeuron de enrichment, Non-AI, cu status «not yet reconciled with runtime registry». **În repo la audit:** execuția OUAI pentru companii silver este mapată pe coada **`agri:ouai`**, procesor `ouaiMembershipProcessor` — inferență euristică membru OUAI din `metadata.apiaData`, proximitate și adresă (fără apel API ANIF dedicat în acest fișier). Coada v2 **nu** apare literal în `queue-registry.ts`; alinierea v2 ↔ runtime rămâne **divergență documentată** (vezi ADR familie enrichment). ANIF ca sursă juridică separată este alt flux: `scrape:legal:anif` / `i2-anif-scraper.ts`, nu înlocuiește acest contract.

## Surse audit

- `docs/CognitiveBrain/v2_cerniq_cognitive_brain_master_implementation_plan.md` — `### NEURON \`enrich:anif:ouai-lookup\`` (~L1995–2015).
- `packages/shared/src/cognitive-node-catalog.ts` — intrare `e1:agri:ouai` / `agri:ouai` (~L791–798).
- `workers/shared/src/queue-registry.ts` — `AGRI_OUAI: "agri:ouai"` (~L72).
- `workers/enrichment/src/main.ts` — mapare `"agri:ouai": ouaiMembershipProcessor` (~L157).
- `workers/enrichment/src/workers/l2-ouai-membership.ts` — `withCognitiveSpan("e1:agri:ouai", …)`, logică `ouaiMembership` în metadata (~L16–101).
- `workers/enrichment/src/workers/i2-anif-scraper.ts` — context «ANIF» separat de OUAI (~L104+); nu este procesorul pentru `agri:ouai`.
- `workers/enrichment/src/workers/agri-workers.integration.test.ts` — export `ouaiMembershipProcessor` (~L6–18).
- `docs/CognitiveBrain/adr/families/e1/enrichment.md` — notă mapare graf vs cod (exemplu OUAI).

## Instanțe v2

- **Catalog (runtime):** `nodeKey` **`e1:agri:ouai`**, coadă BullMQ **`agri:ouai`** (nu `enrich:anif:ouai-lookup`).
- **OTel span name (v2 plan):** `cognitive.enrich.anif.ouai-lookup`
- **Evidence status (v2):** graph-export-grounded; coadă din export ne-reconciliată cu registry (confirmat de audit).

## N/A pe criterii

- **Rând 8:** **N/A** — v2 «Non-AI neuron — deterministic processing»; fără rutare LLM în `l2-ouai-membership.ts`.

## Tabel self-aware (13 criterii)

| # | Criteriu | În cod (dovadă) | Țintă v2 / research | Limită evidență |
| --- | --- | --- | --- | --- |
| 1 | Identitate canonică | **v2_queue** `enrich:anif:ouai-lookup`; **registry literal** pentru acest șir: **lipsă**. Catalog + runtime: **`e1:agri:ouai`** / **`agri:ouai`**. | v2 confirmed queue vs catalog/queue-registry. | v2 §2.4 până la migrare nume unic. |
| 2 | Etapă, familie, swimlane | E1; worker enrichment; catalog swimlane **`enrichment-external`** pentru `agri:ouai`. | v2: E1, enrichment. | — |
| 3 | Rol declarat | Catalog: «Verificare date OUAI (organizare udare/ameliorare irigare)». Cod: scrie `metadata.ouaiMembership` + log `silverEnrichmentLog` sursă `ouai_membership`. | v2 operational/cognitive purpose (generat). | — |
| 4 | NeuronType + SOFAI | `ToolNeuron` în catalog; clasificare **System1 (reactiv)** din v2 §2.1 pentru ToolNeuron (ca în alte contracte E1). | v2 inferred type ToolNeuron. | — |
| 5 | Criticitate | Catalog **MEDIUM**; v2 **MEDIUM**. | v2 + catalog. | — |
| 6 | Înveliș telemetrie | **`withCognitiveSpan("e1:agri:ouai", …)`** în `l2-ouai-membership.ts` (~L17–18). Nume v2 plan (`cognitive.enrich.anif.ouai-lookup`) ≠ primul argument span citit în cod. | ADR-0003; v2 OTel. | Migrare denumiri span ↔ v2. |
| 7 | Înveliș politică | Fără Cedar/OPA în procesor; tier v2 «Tier 4»; persistare JSON + audit log. | v2 autonomy / guardrail text. | — |
| 8 | Rutare model (dacă AI) | **N/A**. | v2 Non-AI. | — |
| 9 | Guardrails | Fără NeMo în fișier; euristici regex + context geografic. | ADR-0007 țintă. | — |
| 10 | Escaladare HITL | Fără `hitl:*` în acest procesor; cozi HITL transversale în registry separat. | ADR-0008. | — |
| 11 | Micro-OODA | Citire job → semnale din metadata/adresă → decizie booleană → `jsonb_set` + log. | v2 OODA. | GraphRAG Neo4j: țintă ADR-0005, neinvocat aici. |
| 12 | Tier + de-escaladare | Erori: `throw` după log fatal (~L102–114). Fără prag 0.80 în cod. | v2 tier/trigger. | Invarianți v2 doar ca țintă fără test dedicați coadă în audit. |
| 13 | Stack v2 §2.3 (subset) | BullMQ worker enrichment, Redis, Postgres (`silverCompanies`, `silverEnrichmentLog`). | v2 stack. | — |

### Mapare OTel

- **v2 / plan:** `cognitive.enrich.anif.ouai-lookup` (convenție plan).
- **Cod:** prim argument `withCognitiveSpan`: **`e1:agri:ouai`** (vezi `l2-ouai-membership.ts`).
- **Stare:** **migrare planificată** — aliniere simbol span / `nodeKey` cu eticheta v2 după reconciliere cozi.
