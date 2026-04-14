# Sinapsă `stock-reserve-order-alert-client-out-for-delivery`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-order-alert-client-out-for-delivery` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-order/stock-reserve-order-alert-client-out-for-delivery.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-reserve-order` | **Contract:** [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). v2 **`stock:reserve:order`**; matrice rând **242**. **Reconciliere:** v2/graf **`stock:reserve:order`** vs **`stock:reserve:create`** (E3) — contract neuron. |
| Destinație (graf) | `alert-client-out-for-delivery` | **Contract:** [`../../../neurons/E4/alert--client--out-for-delivery.md`](../../../neurons/E4/alert--client--out-for-delivery.md). v2 **`alert:client:out-for-delivery`**; matrice rând **182**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **stock-reserve-order** depinde canonic de **alert-client-out-for-delivery**. v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `stock-reserve-order` → `alert-client-out-for-delivery`.
- **Semantic:** vezi matrice rând **182** și contractul neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-order-alert-client-out-for-delivery\``.
