# Sinapsă `graph-full-latest-geo-delivery-optimize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-latest-geo-delivery-optimize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-latest/graph-full-latest-geo-delivery-optimize.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-latest` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--latest.md`](../../../neurons/E5/graph--full--latest.md). **v2:** L8432–L8452. |
| Destinație (graf) | `geo-delivery-optimize` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă **`graph-full-latest`** de **`geo-delivery-optimize`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”; parametrii de optimizare nu sunt în export.

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
| **Runtime (ADR-0001)** | Vezi `queue-registry.ts` și contractele sursă/țintă. |
| **Semantic (ADR-0002)** | Detalii în contractul `geo--delivery--optimize`. |
| **Planificare (export)** | v2 §7 — `graph-full-latest` → `geo-delivery-optimize`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-latest-family.md`](graph-full-latest-family.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-latest-geo-delivery-optimize\``.
