# Sinapsă `contract-template-select-stock-deduct-delivered`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-template-select-stock-deduct-delivered` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-template-select/contract-template-select-stock-deduct-delivered.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-template-select` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-template-select` | **Contract:** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). |
| Destinație (graf) | `stock-deduct-delivered` | **Contract:** [`../../../neurons/E4/stock--deduct--delivered.md`](../../../neurons/E4/stock--deduct--delivered.md). **Semantic (ADR-0002):** `e4:stock:deduct`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-template-select** depinde în planificare de **scăderea stocului la livrare**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie SKU.

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

- **Runtime (ADR-0001):** vezi contract neuron țintă.
- **Semantic (ADR-0002):** E4 stoc / logistică.
- **Planificare:** v2 §7 — `contract-template-select` → `stock-deduct-delivered`.

## Limite și reconcilieri

- Fără presupuneri despre momentul livrării — doar dependența structurală.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-template-select-stock-deduct-delivered\``.
