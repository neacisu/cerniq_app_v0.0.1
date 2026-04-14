# Sinapsă `silver-quality-completeness-pipeline-orchestrator-advance`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-quality-completeness-pipeline-orchestrator-advance` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-quality-completeness/silver-quality-completeness-pipeline-orchestrator-advance.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-quality-completeness` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-quality-completeness` | **Contract:** [`../../../neurons/E1/silver--quality--completeness.md`](../../../neurons/E1/silver--quality--completeness.md). **Runtime (ADR-0001):** v2 `silver:quality:completeness` — execuție **`score:completeness`** — vezi neuron. |
| Destinație (graf) | `pipeline-orchestrator-advance` | **Contract:** [`../../../neurons/E1/pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md). **Runtime:** v2 `pipeline:orchestrator:advance` — **fără** literal dedicat; semantica advance este mapată pe același **`pipeline:orchestrate`** / **`e1:pipeline:orchestrate`** (stages `post_enrichment` / `post_scoring`) — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-quality-completeness** are dependență sintactică față de nodul **pipeline-orchestrator-advance**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** precizează dacă muchia reflectă ordinea reală a handlerelor `post_scoring` față de rularea N1 sau doar topologia statică a grafului.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Planificare:** v2 §7 — `silver-quality-completeness` → `pipeline-orchestrator-advance`.
- **Runtime (ADR-0001):** sursă — `score:completeness`; ținta — **`pipeline:orchestrate`** (nu `pipeline:orchestrator:advance` literal) — vezi ambele contracte neuron.
- **Semantic (ADR-0002):** E1 — vezi ADR [`../../../../adr/families/e1/quality.md`](../../../../adr/families/e1/quality.md), [`../../../../adr/families/e1/orchestrator.md`](../../../../adr/families/e1/orchestrator.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe ambele capete — vezi [`silver--quality--completeness.md`](../../../neurons/E1/silver--quality--completeness.md) și [`pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-quality-completeness-pipeline-orchestrator-advance\``.
