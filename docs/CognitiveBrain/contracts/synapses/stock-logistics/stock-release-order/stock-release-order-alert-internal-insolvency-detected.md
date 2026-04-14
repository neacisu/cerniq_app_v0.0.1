# Sinapsă `stock-release-order-alert-internal-insolvency-detected`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-release-order-alert-internal-insolvency-detected` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-release-order/stock-release-order-alert-internal-insolvency-detected.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-release-order` | **Contract:** [`../../../neurons/E4/stock--release--order.md`](../../../neurons/E4/stock--release--order.md). v2 **`stock:release:order`**; matrice rând **241**. **Reconciliere:** v2/graf **`stock:release:order`** vs operație **`stock:reserve:release`** (E3) — contract neuron. |
| Destinație (graf) | `alert-internal-insolvency-detected` | **Contract:** [`../../../neurons/E4/alert--internal--insolvency-detected.md`](../../../neurons/E4/alert--internal--insolvency-detected.md). v2 **`alert:internal:insolvency-detected`**; matrice rând **191**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **stock-release-order** depinde canonic de **alert-internal-insolvency-detected**. v2: **„sinapsă canonică de pipeline”**.

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

- **Planificare:** v2 §7 — `stock-release-order` → `alert-internal-insolvency-detected`.
- **Semantic:** vezi matrice rând **191** și contractul neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-release-order-alert-internal-insolvency-detected\``.
