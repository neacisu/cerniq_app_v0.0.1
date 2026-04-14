# Sinapsă `graph-community-detect-geo-delivery-optimize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-community-detect-geo-delivery-optimize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-community-detect/graph-community-detect-geo-delivery-optimize.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-community-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-community-detect` | **Contract:** [`../../../neurons/E5/graph--community--detect.md`](../../../neurons/E5/graph--community--detect.md). **Runtime (ADR-0001):** v2 `graph:community:detect` — coada canonică **`community:detect:leiden`** — vezi neuron. |
| Destinație (graf) | `geo-delivery-optimize` | **Contract:** [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md). **Runtime:** v2 `geo:delivery:optimize` **fără** literal în registry; acoperire parțială prin **`geo:proximity:calculate`** / **`geo:catchment:build`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-community-detect** are dependență sintactică față de nodul **geo-delivery-optimize**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie parametri de optimizare sau livrare.

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

- **Planificare:** v2 §7 — `graph-community-detect` → `geo-delivery-optimize`.
- **Runtime (ADR-0001):** sursă — reconciliere **`graph:community:detect`** ↔ **`community:detect:leiden`**; ținta — **gap** nume unic + cozi parțiale — vezi [`geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md).
- **Semantic (ADR-0002):** E5 geo — vezi [`../../../../adr/families/e5/geo.md`](../../../../adr/families/e5/geo.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă — vezi [`graph--community--detect.md`](../../../neurons/E5/graph--community--detect.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-community-detect-geo-delivery-optimize\``.
