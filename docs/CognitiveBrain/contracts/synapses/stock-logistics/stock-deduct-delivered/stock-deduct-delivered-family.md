# Sinapsă `stock-deduct-delivered-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-deduct-delivered-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-deduct-delivered/stock-deduct-delivered-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-deduct-delivered` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `stock-deduct-delivered` | Traseu în graf; contract neuron: [`../../../neurons/E4/stock--deduct--delivered.md`](../../../neurons/E4/stock--deduct--delivered.md). **v2:** **`stock:deduct:delivered`**. **Runtime (ADR-0001):** procesorul folosește coada **`stock:deduct`** (`E4_STOCK_DEDUCT`, `queue-registry.ts` ~L442); **nu** există literal `stock:deduct:delivered` în registry — vezi contractul neuron. **Semantic:** `e4:stock:deduct` în matrice (coloane contract neuron). |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **stock-deduct-delivered** sub agregatul **`e4-logistics`**. v2: **„specializează familia”** — fără payload / retry / safety / telemetrie per-muchie în registrul §7.

## Sinapse dependență în același traseu

[`stock-deduct-delivered-alert-client-account-blocked.md`](stock-deduct-delivered-alert-client-account-blocked.md), [`stock-deduct-delivered-alert-client-contract-pending.md`](stock-deduct-delivered-alert-client-contract-pending.md), [`stock-deduct-delivered-alert-client-credit-insufficient.md`](stock-deduct-delivered-alert-client-credit-insufficient.md), [`stock-deduct-delivered-alert-client-delivered.md`](stock-deduct-delivered-alert-client-delivered.md), [`stock-deduct-delivered-alert-client-delivery-failed.md`](stock-deduct-delivered-alert-client-delivery-failed.md), [`stock-deduct-delivered-alert-client-out-for-delivery.md`](stock-deduct-delivered-alert-client-out-for-delivery.md), [`stock-deduct-delivered-alert-client-payment-received.md`](stock-deduct-delivered-alert-client-payment-received.md), [`stock-deduct-delivered-alert-client-payment-reminder.md`](stock-deduct-delivered-alert-client-payment-reminder.md), [`stock-deduct-delivered-alert-client-return-created.md`](stock-deduct-delivered-alert-client-return-created.md), [`stock-deduct-delivered-alert-client-shipped.md`](stock-deduct-delivered-alert-client-shipped.md), [`stock-deduct-delivered-alert-internal-compliance-issue.md`](stock-deduct-delivered-alert-internal-compliance-issue.md), [`stock-deduct-delivered-alert-internal-contract-signed.md`](stock-deduct-delivered-alert-internal-contract-signed.md), [`stock-deduct-delivered-alert-internal-credit-blocked.md`](stock-deduct-delivered-alert-internal-credit-blocked.md), [`stock-deduct-delivered-alert-internal-daily-summary.md`](stock-deduct-delivered-alert-internal-daily-summary.md), [`stock-deduct-delivered-alert-internal-insolvency-detected.md`](stock-deduct-delivered-alert-internal-insolvency-detected.md), [`stock-deduct-delivered-alert-internal-oblio-sync-failed.md`](stock-deduct-delivered-alert-internal-oblio-sync-failed.md), [`stock-deduct-delivered-alert-internal-return-received.md`](stock-deduct-delivered-alert-internal-return-received.md), [`stock-deduct-delivered-alert-internal-stock-insufficient.md`](stock-deduct-delivered-alert-internal-stock-insufficient.md), [`stock-deduct-delivered-alert-internal-storno-failed.md`](stock-deduct-delivered-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `stock-deduct-delivered` → `e4-logistics`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `stock:deduct:delivered`, rând **240**; `nodeKey` runtime **`e4:stock:deduct`** (vezi matrice / contract).
- **Runtime (ADR-0001):** **`stock:deduct`** — vezi contractul neuron.

## Limite și reconcilieri

- Graf **`stock-deduct-delivered`** vs coadă **`stock:deduct`** — contract neuron.
- **`e4-logistics`** nu înlocuiește identitatea cozii de deducere.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-deduct-delivered-family\``.
