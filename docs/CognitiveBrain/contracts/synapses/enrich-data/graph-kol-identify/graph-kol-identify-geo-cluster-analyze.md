# Sinapsă `graph-kol-identify-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-kol-identify-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-kol-identify/graph-kol-identify-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-kol-identify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-kol-identify` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--kol--identify.md`](../../../neurons/E5/graph--kol--identify.md). **v2:** L8476–L8499. |
| Destinație (graf) | `geo-cluster-analyze` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă **`graph-kol-identify`** de **`geo-cluster-analyze`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”; ordinea și datele concrete între KOL și analiza de cluster nu sunt în export.

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

| Autoritate | Observație |
| --- | --- |
| **Runtime (ADR-0001)** | Sursă: `kol:identify` (vezi neuron); destinație: `cluster:implicit:detect`. |
| **Semantic (ADR-0002)** | `e5:kol:identify` vs `e5:cluster:implicit-detect` — detalii în contractele respective. |
| **Planificare (export)** | v2 §7 — `graph-kol-identify` → `geo-cluster-analyze`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-kol-identify-family.md`](graph-kol-identify-family.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-kol-identify-geo-cluster-analyze\``.
