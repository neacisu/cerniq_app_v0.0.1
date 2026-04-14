# Sinapsă `graph-communities-latest-geo-neighbor-find`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-communities-latest-geo-neighbor-find` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-communities-latest/graph-communities-latest-geo-neighbor-find.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-communities-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-communities-latest` | **Contract:** [`../../../neurons/E5/graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md). **Runtime (ADR-0001):** v2 `graph:communities:latest` — **fără** literal în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `geo-neighbor-find` | **Contract:** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). **Runtime:** v2 `geo:neighbor:find` mapat la **`geo:neighbor:identify`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-communities-latest** are dependență sintactică față de nodul **geo-neighbor-find**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie praguri de proximitate sau scheme de date.

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

- **Planificare:** v2 §7 — `graph-communities-latest` → `geo-neighbor-find`.
- **Runtime (ADR-0001):** sursă — **gap** nume `graph:communities:latest` în registry; ținta — **`geo:neighbor:identify`** — vezi ambele contracte neuron.
- **Semantic (ADR-0002):** E5 geo — vezi [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi [`graph--communities--latest.md`](../../../neurons/E5/graph--communities--latest.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-communities-latest-geo-neighbor-find\``.
