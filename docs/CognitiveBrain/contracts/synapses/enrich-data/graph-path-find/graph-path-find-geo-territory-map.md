# Sinapsă `graph-path-find-geo-territory-map`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-path-find-geo-territory-map` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-path-find/graph-path-find-geo-territory-map.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-path-find` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-path-find` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--path--find.md`](../../../neurons/E5/graph--path--find.md). **v2:** L8501–L8521. |
| Destinație (graf) | `geo-territory-map` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă **`graph-path-find`** de **`geo-territory-map`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”.

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
| **Runtime (ADR-0001)** | Vezi contractele sursă și țintă. |
| **Semantic (ADR-0002)** | Vezi `geo--territory--map`. |
| **Planificare (export)** | v2 §7 — `graph-path-find` → `geo-territory-map`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-path-find-family.md`](graph-path-find-family.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-path-find-geo-territory-map\``.
