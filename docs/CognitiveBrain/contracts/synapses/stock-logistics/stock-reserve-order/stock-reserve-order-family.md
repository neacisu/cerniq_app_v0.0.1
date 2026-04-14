# Sinapsă `stock-reserve-order-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-order-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-order/stock-reserve-order-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `stock-reserve-order` | Traseu în graf; contract neuron: [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). **v2:** **`stock:reserve:order`** (graf). **Reconciliere runtime:** cel mai apropiat echivalent documentat este **`stock:reserve:create`** (E3) — vezi contractul neuron. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **stock-reserve-order** sub **`e4-logistics`**. v2: **„specializează familia”**.

## Sinapse dependență în același traseu

[`stock-reserve-order-alert-client-account-blocked.md`](stock-reserve-order-alert-client-account-blocked.md), [`stock-reserve-order-alert-client-contract-pending.md`](stock-reserve-order-alert-client-contract-pending.md), [`stock-reserve-order-alert-client-credit-insufficient.md`](stock-reserve-order-alert-client-credit-insufficient.md), [`stock-reserve-order-alert-client-delivered.md`](stock-reserve-order-alert-client-delivered.md), [`stock-reserve-order-alert-client-delivery-failed.md`](stock-reserve-order-alert-client-delivery-failed.md), [`stock-reserve-order-alert-client-out-for-delivery.md`](stock-reserve-order-alert-client-out-for-delivery.md), [`stock-reserve-order-alert-client-payment-received.md`](stock-reserve-order-alert-client-payment-received.md), [`stock-reserve-order-alert-client-payment-reminder.md`](stock-reserve-order-alert-client-payment-reminder.md), [`stock-reserve-order-alert-client-return-created.md`](stock-reserve-order-alert-client-return-created.md), [`stock-reserve-order-alert-client-shipped.md`](stock-reserve-order-alert-client-shipped.md), [`stock-reserve-order-alert-internal-compliance-issue.md`](stock-reserve-order-alert-internal-compliance-issue.md), [`stock-reserve-order-alert-internal-contract-signed.md`](stock-reserve-order-alert-internal-contract-signed.md), [`stock-reserve-order-alert-internal-credit-blocked.md`](stock-reserve-order-alert-internal-credit-blocked.md), [`stock-reserve-order-alert-internal-daily-summary.md`](stock-reserve-order-alert-internal-daily-summary.md), [`stock-reserve-order-alert-internal-insolvency-detected.md`](stock-reserve-order-alert-internal-insolvency-detected.md), [`stock-reserve-order-alert-internal-oblio-sync-failed.md`](stock-reserve-order-alert-internal-oblio-sync-failed.md), [`stock-reserve-order-alert-internal-return-received.md`](stock-reserve-order-alert-internal-return-received.md), [`stock-reserve-order-alert-internal-stock-insufficient.md`](stock-reserve-order-alert-internal-stock-insufficient.md), [`stock-reserve-order-alert-internal-storno-failed.md`](stock-reserve-order-alert-internal-storno-failed.md)

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Planificare:** v2 §7 — `stock-reserve-order` → `e4-logistics`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `stock:reserve:order`, rând **242**; mapare catalog spre **`e3:stock:reserve-create`** (vezi matrice).
- **Runtime (ADR-0001):** **`stock:reserve:create`** (E3) pentru rezervare — vezi contractul neuron.

## Limite și reconcilieri

- Etapă v2 E4 vs implementare E3 pentru rezervare — contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-order-family\``.
