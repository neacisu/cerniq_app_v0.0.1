# Sinapsă `graph-centrality-calculate-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-centrality-calculate-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-centrality-calculate/graph-centrality-calculate-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-centrality-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-centrality-calculate` | **Contract:** [`../../../neurons/E5/graph--centrality--calculate.md`](../../../neurons/E5/graph--centrality--calculate.md). **Runtime (ADR-0001):** v2 `graph:centrality:calculate` — coada canonică **`centrality:calculate`** — vezi neuron. |
| Destinație (graf) | `geo-cluster-analyze` | **Contract:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). **Runtime:** v2 `geo:cluster:analyze` mapat la **`cluster:implicit:detect`** în neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-centrality-calculate** are dependență sintactică față de nodul **geo-cluster-analyze**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie date schimbate între noduri.

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

- **Planificare:** v2 §7 — `graph-centrality-calculate` → `geo-cluster-analyze`.
- **Runtime (ADR-0001):** sursă — reconciliere **`graph:centrality:calculate`** ↔ **`centrality:calculate`**; ținta — **`cluster:implicit:detect`** — vezi ambele contracte neuron.
- **Semantic (ADR-0002):** E5 geo — vezi [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi [`graph--centrality--calculate.md`](../../../neurons/E5/graph--centrality--calculate.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-centrality-calculate-geo-cluster-analyze\``.
