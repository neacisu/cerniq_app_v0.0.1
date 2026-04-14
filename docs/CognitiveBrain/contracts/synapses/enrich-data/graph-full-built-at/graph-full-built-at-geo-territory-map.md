# Sinapsă `graph-full-built-at-geo-territory-map`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-built-at-geo-territory-map` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-built-at/graph-full-built-at-geo-territory-map.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-built-at` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-built-at` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md). **v2:** L8410–L8430. |
| Destinație (graf) | `geo-territory-map` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--territory--map.md`](../../../neurons/E5/geo--territory--map.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **`dependency`** leagă în planificare **`graph-full-built-at`** de **`geo-territory-map`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”. Nu se afirmă din export sursa hărților teritoriale, rezoluția sau formatul — acestea țin de contractul neuron destinație și de branch.

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
| **Runtime (ADR-0001)** | Vezi `queue-registry.ts` prin `geo--territory--map` și gap sursă în `graph--full--built_at`. |
| **Semantic (ADR-0002)** | `e5:geo:territory-calculate` sau echivalent din contract destinație — nu duplicat aici. |
| **Planificare (export)** | v2 §7 — `graph-full-built-at` → `geo-territory-map`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-built-at-family.md`](graph-full-built-at-family.md).

## Limite și reconcilieri

- Conservator: doar ce apare în v2 §7 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-built-at-geo-territory-map\``.
