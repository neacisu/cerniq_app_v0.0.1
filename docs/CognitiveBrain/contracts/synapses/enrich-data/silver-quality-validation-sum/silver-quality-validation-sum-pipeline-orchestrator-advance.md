# Sinapsă `silver-quality-validation-sum-pipeline-orchestrator-advance`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-quality-validation-sum-pipeline-orchestrator-advance` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-quality-validation-sum/silver-quality-validation-sum-pipeline-orchestrator-advance.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-quality-validation-sum` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `silver-quality-validation-sum` | **Contract:** [`../../../neurons/E1/silver--quality--validation-sum.md`](../../../neurons/E1/silver--quality--validation-sum.md). **Runtime (ADR-0001):** v2 `silver:quality:validation-sum` — **fără** coadă literală; execuție documentată prin **`aggregate:quality-rollup`** — vezi neuron. |
| Destinație (graf) | `pipeline-orchestrator-advance` | **Contract:** [`../../../neurons/E1/pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md). **Runtime:** **`pipeline:orchestrate`** / **`e1:pipeline:orchestrate`** (stages advance) — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **silver-quality-validation-sum** are dependență sintactică față de nodul **pipeline-orchestrator-advance**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** precizează dacă totalul agregat este consumat în `post_scoring` sau doar apare în același subgraph planificat.

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

- **Planificare:** v2 §7 — `silver-quality-validation-sum` → `pipeline-orchestrator-advance`.
- **Runtime (ADR-0001):** sursă — **gap** literal; **`aggregate:quality-rollup`**; ținta — **`pipeline:orchestrate`** — vezi contractele neuron.
- **Semantic (ADR-0002):** E1 — vezi ADR [`../../../../adr/families/e1/quality.md`](../../../../adr/families/e1/quality.md), [`../../../../adr/families/e1/orchestrator.md`](../../../../adr/families/e1/orchestrator.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe ambele capete — vezi [`silver--quality--validation-sum.md`](../../../neurons/E1/silver--quality--validation-sum.md) și [`pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-quality-validation-sum-pipeline-orchestrator-advance\``.
