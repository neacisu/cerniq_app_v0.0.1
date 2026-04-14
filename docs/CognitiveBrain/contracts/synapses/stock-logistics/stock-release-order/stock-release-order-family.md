# Sinapsă `stock-release-order-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-release-order-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-release-order/stock-release-order-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `stock-release-order` | Traseu în graf; contract neuron: [`../../../neurons/E4/stock--release--order.md`](../../../neurons/E4/stock--release--order.md). **v2:** **`stock:release:order`** (graf). **Reconciliere runtime:** operația de eliberare rezervă este mapată în cod la **`stock:reserve:release`** (E3) — vezi contractul neuron și ADR e3-stock. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **stock-release-order** sub **`e4-logistics`**. v2: **„specializează familia”**.

## Sinapse dependență în același traseu

[`stock-release-order-alert-client-account-blocked.md`](stock-release-order-alert-client-account-blocked.md), [`stock-release-order-alert-client-contract-pending.md`](stock-release-order-alert-client-contract-pending.md), [`stock-release-order-alert-client-credit-insufficient.md`](stock-release-order-alert-client-credit-insufficient.md), [`stock-release-order-alert-client-delivered.md`](stock-release-order-alert-client-delivered.md), [`stock-release-order-alert-client-delivery-failed.md`](stock-release-order-alert-client-delivery-failed.md), [`stock-release-order-alert-client-out-for-delivery.md`](stock-release-order-alert-client-out-for-delivery.md), [`stock-release-order-alert-client-payment-received.md`](stock-release-order-alert-client-payment-received.md), [`stock-release-order-alert-client-payment-reminder.md`](stock-release-order-alert-client-payment-reminder.md), [`stock-release-order-alert-client-return-created.md`](stock-release-order-alert-client-return-created.md), [`stock-release-order-alert-client-shipped.md`](stock-release-order-alert-client-shipped.md), [`stock-release-order-alert-internal-compliance-issue.md`](stock-release-order-alert-internal-compliance-issue.md), [`stock-release-order-alert-internal-contract-signed.md`](stock-release-order-alert-internal-contract-signed.md), [`stock-release-order-alert-internal-credit-blocked.md`](stock-release-order-alert-internal-credit-blocked.md), [`stock-release-order-alert-internal-daily-summary.md`](stock-release-order-alert-internal-daily-summary.md), [`stock-release-order-alert-internal-insolvency-detected.md`](stock-release-order-alert-internal-insolvency-detected.md), [`stock-release-order-alert-internal-oblio-sync-failed.md`](stock-release-order-alert-internal-oblio-sync-failed.md), [`stock-release-order-alert-internal-return-received.md`](stock-release-order-alert-internal-return-received.md), [`stock-release-order-alert-internal-stock-insufficient.md`](stock-release-order-alert-internal-stock-insufficient.md), [`stock-release-order-alert-internal-storno-failed.md`](stock-release-order-alert-internal-storno-failed.md)

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

- **Planificare:** v2 §7 — `stock-release-order` → `e4-logistics`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `stock:release:order`, rând **241**; echivalent **`e3:stock:reserve-release`** (vezi matrice).
- **Runtime (ADR-0001):** **`stock:reserve:release`** (E3) — vezi contractul neuron.

## Limite și reconcilieri

- Graf **`stock-release-order`** vs coadă **`stock:reserve:release`** — contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-release-order-family\``.
