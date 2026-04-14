# Sinapsă `sameday-return-initiate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-return-initiate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-return-initiate/sameday-return-initiate-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-return-initiate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-return-initiate` | Traseu în graf; contract neuron: [`../../../neurons/E4/sameday--return--initiate.md`](../../../neurons/E4/sameday--return--initiate.md). **Triplă autoritate:** v2 **`sameday:return:initiate`**; **`e4:sameday:return-initiate`**; matrice rând **237** — vezi neuron și registry. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4**. [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **sameday-return-initiate** sub **`e4-logistics`**. v2: **„specializează familia**” — fără payload/retry/safety/telemetrie per-muchie în registru.

## Sinapse dependență în același traseu

[`sameday-return-initiate-alert-client-account-blocked.md`](sameday-return-initiate-alert-client-account-blocked.md), [`sameday-return-initiate-alert-client-contract-pending.md`](sameday-return-initiate-alert-client-contract-pending.md), [`sameday-return-initiate-alert-client-credit-insufficient.md`](sameday-return-initiate-alert-client-credit-insufficient.md), [`sameday-return-initiate-alert-client-delivered.md`](sameday-return-initiate-alert-client-delivered.md), [`sameday-return-initiate-alert-client-delivery-failed.md`](sameday-return-initiate-alert-client-delivery-failed.md), [`sameday-return-initiate-alert-client-out-for-delivery.md`](sameday-return-initiate-alert-client-out-for-delivery.md), [`sameday-return-initiate-alert-client-payment-received.md`](sameday-return-initiate-alert-client-payment-received.md), [`sameday-return-initiate-alert-client-payment-reminder.md`](sameday-return-initiate-alert-client-payment-reminder.md), [`sameday-return-initiate-alert-client-return-created.md`](sameday-return-initiate-alert-client-return-created.md), [`sameday-return-initiate-alert-client-shipped.md`](sameday-return-initiate-alert-client-shipped.md), [`sameday-return-initiate-alert-internal-compliance-issue.md`](sameday-return-initiate-alert-internal-compliance-issue.md), [`sameday-return-initiate-alert-internal-contract-signed.md`](sameday-return-initiate-alert-internal-contract-signed.md), [`sameday-return-initiate-alert-internal-credit-blocked.md`](sameday-return-initiate-alert-internal-credit-blocked.md), [`sameday-return-initiate-alert-internal-daily-summary.md`](sameday-return-initiate-alert-internal-daily-summary.md), [`sameday-return-initiate-alert-internal-insolvency-detected.md`](sameday-return-initiate-alert-internal-insolvency-detected.md), [`sameday-return-initiate-alert-internal-oblio-sync-failed.md`](sameday-return-initiate-alert-internal-oblio-sync-failed.md), [`sameday-return-initiate-alert-internal-return-received.md`](sameday-return-initiate-alert-internal-return-received.md), [`sameday-return-initiate-alert-internal-stock-insufficient.md`](sameday-return-initiate-alert-internal-stock-insufficient.md), [`sameday-return-initiate-alert-internal-storno-failed.md`](sameday-return-initiate-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-return-initiate` → `e4-logistics`.
- **Semantic:** matrice **`sameday:return:initiate`**, rând **237**.
- **Runtime:** vezi contractul neuron.

## Limite și reconcilieri

- **`e4-logistics`** ≠ `e4:sameday:return-initiate`; reconciliere prin ADR + neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-return-initiate-family\``.
