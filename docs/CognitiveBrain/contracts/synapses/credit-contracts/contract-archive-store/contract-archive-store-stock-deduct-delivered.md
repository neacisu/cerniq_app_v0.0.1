# Sinapsă `contract-archive-store-stock-deduct-delivered`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-stock-deduct-delivered` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-stock-deduct-delivered.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-archive-store` | **Contract:** [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Runtime:** `document:archive:store`. **Semantic:** `e3:document:archive-store`. |
| Destinație (graf) | `stock-deduct-delivered` | **Contract:** [`../../../neurons/E4/stock--deduct--delivered.md`](../../../neurons/E4/stock--deduct--delivered.md). **Runtime / catalog:** vezi contract neuron (posibile gap-uri E4 vs E3). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **contract-archive-store** depinde canonic de **`stock-deduct-delivered`**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie impactul asupra stocului la livrare.

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

- **Runtime (ADR-0001):** sursa — registry E3; ținta — vezi [`stock--deduct--delivered.md`](../../../neurons/E4/stock--deduct--delivered.md) pentru reconciliere cu `QUEUES`.
- **Semantic (ADR-0002):** E3 fiscal-docs → E4 logistics stock.
- **Planificare:** `contract-archive-store` → `stock-deduct-delivered`.

## Limite și reconcilieri

- Neuronii E4 pentru stoc pot indica echivalente E3 sau gap-uri — nu generaliza fără contractul țintă.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-stock-deduct-delivered\``.
