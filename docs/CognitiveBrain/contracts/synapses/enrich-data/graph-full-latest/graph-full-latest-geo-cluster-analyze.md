# Sinapsă `graph-full-latest-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-latest-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-latest/graph-full-latest-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-latest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-latest` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--latest.md`](../../../neurons/E5/graph--full--latest.md). **v2:** L8432–L8452. |
| Destinație (graf) | `geo-cluster-analyze` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md) — reconciliere v2 `geo:cluster:analyze` ↔ runtime `cluster:implicit:detect` în acel contract. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, muchia **`dependency`** leagă **`graph-full-latest`** de **`geo-cluster-analyze`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline”; fără detalii suplimentare în export — interpretarea operațională în cod și contractele neuron.

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
| **Runtime (ADR-0001)** | Sursă: gap `graph:full:latest`; țintă: `cluster:implicit:detect` — vezi contractele. |
| **Semantic (ADR-0002)** | În catalog apare `e5:cluster:implicit-detect`; în graf apare `geo-cluster-analyze` — reconciliere în contractul țintă. |
| **Planificare (export)** | v2 §7 — `graph-full-latest` → `geo-cluster-analyze`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-latest-family.md`](graph-full-latest-family.md).

## Limite și reconcilieri

- **Slug graf vs literal coadă:** nu se confundă etichetele nodului cu numele cozii.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-latest-geo-cluster-analyze\``.
