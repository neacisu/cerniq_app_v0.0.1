# Sinapsă `graph-full-built-at-geo-delivery-optimize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-built-at-geo-delivery-optimize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-built-at/graph-full-built-at-geo-delivery-optimize.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-built-at` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-built-at` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md). **v2:** L8410–L8430. |
| Destinație (graf) | `geo-delivery-optimize` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--delivery--optimize.md`](../../../neurons/E5/geo--delivery--optimize.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, muchia **`dependency`** leagă **`graph-full-built-at`** de **`geo-delivery-optimize`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”. Exportul nu precizează parametri de optimizare, constrângeri sau payload; detaliile aparțin implementării și contractului neuron țintă, nu acestui registru de muchie.

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
| **Runtime (ADR-0001)** | Cozi efective — vezi `queue-registry.ts` și contractul neuron `geo--delivery--optimize`; sursă graf rămâne cu gap documentat în `graph--full--built_at`. |
| **Semantic (ADR-0002)** | Etapă E5 / familie geo vs `graph-community` pentru sursă — nu se colapsează fără dovada din catalog. |
| **Planificare (export)** | v2 §7 — `graph-full-built-at` → `geo-delivery-optimize`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-built-at-family.md`](graph-full-built-at-family.md).

## Limite și reconcilieri

- Fără inventare de contracte handler sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-built-at-geo-delivery-optimize\``.
