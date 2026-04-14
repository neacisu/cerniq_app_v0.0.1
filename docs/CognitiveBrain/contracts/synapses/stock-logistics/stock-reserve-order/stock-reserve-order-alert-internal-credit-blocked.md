# Sinapsă `stock-reserve-order-alert-internal-credit-blocked`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-order-alert-internal-credit-blocked` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-order/stock-reserve-order-alert-internal-credit-blocked.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-reserve-order` | **Contract:** [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). v2 **`stock:reserve:order`**; matrice rând **242**. **Reconciliere:** v2/graf **`stock:reserve:order`** vs **`stock:reserve:create`** (E3) — contract neuron. |
| Destinație (graf) | `alert-internal-credit-blocked` | **Contract:** [`../../../neurons/E4/alert--internal--credit-blocked.md`](../../../neurons/E4/alert--internal--credit-blocked.md). v2 **`alert:internal:credit-blocked`**; matrice rând **189**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **stock-reserve-order** depinde canonic de **alert-internal-credit-blocked**. v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `stock-reserve-order` → `alert-internal-credit-blocked`.
- **Semantic:** vezi matrice rând **189** și contractul neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-order-alert-internal-credit-blocked\``.
