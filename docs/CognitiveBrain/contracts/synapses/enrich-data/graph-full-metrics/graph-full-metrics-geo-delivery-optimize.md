# Sinapsă `graph-full-metrics-geo-delivery-optimize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-metrics-geo-delivery-optimize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-metrics/graph-full-metrics-geo-delivery-optimize.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-metrics` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--metrics.md`](../../../neurons/E5/graph--full--metrics.md). **v2:** L8454–L8474. |
| Destinație (graf) | `geo-delivery-optimize` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă **`graph-full-metrics`** de **`geo-delivery-optimize`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”.

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
| **Runtime (ADR-0001)** | Vezi contractele sursă și destinație. |
| **Semantic (ADR-0002)** | Vezi `geo--delivery--optimize`. |
| **Planificare (export)** | v2 §7 — `graph-full-metrics` → `geo-delivery-optimize`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-metrics-family.md`](graph-full-metrics-family.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-metrics-geo-delivery-optimize\``.
