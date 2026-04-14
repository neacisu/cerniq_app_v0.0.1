# Sinapsă `graph-relationship-create-geo-neighbor-find`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-relationship-create-geo-neighbor-find` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-relationship-create/graph-relationship-create-geo-neighbor-find.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-relationship-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `graph-relationship-create` | **Contract:** [`../../../neurons/E5/graph--relationship--create.md`](../../../neurons/E5/graph--relationship--create.md). **Runtime (ADR-0001):** vezi neuron — **`graph:build:relationships`**. |
| Destinație (graf) | `geo-neighbor-find` | **Contract:** [`../../../neurons/E5/geo--neighbor--find.md`](../../../neurons/E5/geo--neighbor--find.md). E5 — vezi [`../../../../adr/families/e5/graph-community.md`](../../../../adr/families/e5/graph-community.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **graph-relationship-create** are dependență sintactică față de **geo-neighbor-find**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `graph-relationship-create` → `geo-neighbor-find`.
- **Runtime (ADR-0001):** E5 — vezi neuronii sursă și țintă.
- **Semantic (ADR-0002):** vezi catalog pentru `nodeKey`-uri.

## Limite și reconcilieri

- **Sursă:** reconciliere graf ↔ registry — vezi neuronul `graph:relationship:create`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-relationship-create-geo-neighbor-find\``.
