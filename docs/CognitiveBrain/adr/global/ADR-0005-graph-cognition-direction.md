# ADR-0005 — Direcție cogniție pe graf

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0005 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0005 — Graph cognition direction» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — doar dacă completează gap față de v2 |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — graf, GraphRAG, memorie agent |
| Fișiere autoritate (repo) | _Nicio bibliotecă Neo4j client identificată în auditul TypeScript_ |

## Context

v2 plasează **Neo4j Enterprise**, **GDS**, stack **GraphRAG** și **agent-memory** ca substrat pentru memorie relațională, comunități și raționament pe graf. Acest ADR separă **direcția** de **dovada** în monorepo.

## Decizie (canonică din v2)

- **Decizie:** Neo4j5.23 Enterprise + GDS 2.12 + unelte GraphRAG/`neo4j-agent-memory` sunt substratul țintă pentru world-model, comunități și GraphRAG.
- **Consecință (v2):** inteligența relațională și retrieval-ul augmentat de graf trebuie să **convergă** spre Neo4j, nu spre grafuri JSON ad-hoc.

## Dovezi în implementarea Cerniq

### Căutare în cod (audit2026-04-11)

- Căutări pentru `neo4j`, driver Neo4j, `graphdatascience`, `neo4j-graphrag` în `*.ts` — **fără potriviri relevante** în sesiunea de audit.
- `packages/shared/src/cognitive-node-catalog.ts` — swimlane-uri E5 includ literalul `"graph-community"` ca **etichetă de pipeline**; **nu** implică prezența unui cluster Neo4j.

### Topologie «brain» în API

- [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) construiește o **topologie pentru UI** din catalog + muchii (swimlane / DB import) — este un **graf de prezentare**, nu un engine Neo4j.

## Aliniere la cercetare

Research-ul susține grafuri pentru memorie pe termen lung și comunități; **repo-ul** nu demonstrează încă integrarea Neo4j la acest nivel.

## Reconciliere v2 ↔ cod

| Componentă v2 | Repo |
| --- | --- |
| Neo4j 5.23 Enterprise | **Neimplementat confirmat** în codul TypeScript auditat. |
| Algoritmi GDS (Leiden, PageRank, FastRP, …) | **Direcție** — fără apeluri identificate. |
| `neo4j-graphrag-python` / `neo4j-agent-memory` | **Direcție** — nu apar în dependențele Node din monorepo la audit. |
| Pattern activare sinaptic v2 (Cypher, decay) | **Direcție** — fără evidență. |

## Consecințe operaționale

1. Orice inițiativă GraphRAG trebuie precedată de ADR de integrare (driver, secrete, migrații, observabilitate).
2. Până atunci, «graph cognition» în producție CerniqAPP rămâne **PostgreSQL + Redis + catalog static**, plus exporturi de planificare din documentație.

## Criterii de acceptanță (documentare)

- [ ] Primul modul cu driver Neo4j — link în acest ADR + tabel reconciliere v2.
- [ ] Strategie de date: ce rămâne în PG vs mutat în Neo4j.

## Surse externe

- **Neo4j Docs:** [https://neo4j.com/docs/](https://neo4j.com/docs/) — verificat la **2026-04-11** (context produs; nu dovedește integrarea în repo).
- **Neo4j Graph Data Science:** [https://neo4j.com/docs/graph-data-science/current/](https://neo4j.com/docs/graph-data-science/current/) — verificat la **2026-04-11**.

## Limită evidență

- Servicii sau workeri Python **în afara** căii `*.ts` auditate pot exista; acest ADR reflectă **auditul monorepo TypeScript** și `package.json` vizibil, nu inventariază toate containerele organizației.
- Versiunile exacte Neo4j/GDS din v2 nu sunt validate față de licențe sau cluster real.

## Legături

- ADR-0002 (topologie UI), ADR-0006 (modele); [README Cognitive Brain](../../README.md).
