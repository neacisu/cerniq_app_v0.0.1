# Sinapsă `graph-full-built-at-geo-cluster-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `graph-full-built-at-geo-cluster-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/graph-full-built-at/graph-full-built-at-geo-cluster-analyze.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `graph-full-built-at` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare și contracte |
| --- | --- | --- |
| Sursă | `graph-full-built-at` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/graph--full--built_at.md`](../../../neurons/E5/graph--full--built_at.md). **v2:** L8410–L8430. |
| Destinație (graf) | `geo-cluster-analyze` | **Planificare (graf).** **Neuron:** [`../../../neurons/E5/geo--cluster--analyze.md`](../../../neurons/E5/geo--cluster--analyze.md) — reconciliere v2 `geo:cluster:analyze` ↔ runtime `cluster:implicit:detect` în acel contract. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful exportat, muchia **`dependency`** leagă nodul **`graph-full-built-at`** de **`geo-cluster-analyze`**. **Descriere confirmată în v2:** „sinapsă canonică de pipeline” — fără detalii suplimentare în export despre câmpuri, ordine de execuție handler sau semantica datelor; interpretarea operațională trebuie ancorată în cod și contractele neuron, nu presupusă aici.

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
| **Runtime (ADR-0001)** | Cozi efective: vezi `queue-registry.ts` prin contractele celor doi neuroni (sursă: gap pentru `graph:full:built_at`; destinație: `cluster:implicit:detect`). |
| **Semantic (ADR-0002)** | În catalog apare `e5:cluster:implicit-detect`; în graf apare `geo-cluster-analyze` — reconciliere în contractul destinație. |
| **Planificare (export)** | v2 §7 — `graph-full-built-at` → `geo-cluster-analyze`, tip `dependency`. |

## Traseu și vecini

- Manifest: [`graph-full-built-at-family.md`](graph-full-built-at-family.md).

## Limite și reconcilieri

- **Slug graf vs literal coadă:** numele nodurilor din export **nu** trebuie confundate cu numele cozilor BullMQ.
- Fără completări despre payload sau retry acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`graph-full-built-at-geo-cluster-analyze\``.
