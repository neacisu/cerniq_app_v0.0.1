# Sinapsă `sameday-pickup-schedule-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-pickup-schedule-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-pickup-schedule/sameday-pickup-schedule-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-pickup-schedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-pickup-schedule` | Contract neuron: [`../../../neurons/E4/sameday--pickup--schedule.md`](../../../neurons/E4/sameday--pickup--schedule.md). **Triplă autoritate:** v2 **`sameday:pickup:schedule`**; **`e4:sameday:pickup-schedule`**; matrice rând **236**. |
| Destinație (graf) | `e4-logistics` | [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **sameday-pickup-schedule** sub **`e4-logistics`**. v2: **„specializează familia**”.

## Sinapse dependență în același traseu

[`sameday-pickup-schedule-alert-client-account-blocked.md`](sameday-pickup-schedule-alert-client-account-blocked.md), [`sameday-pickup-schedule-alert-client-contract-pending.md`](sameday-pickup-schedule-alert-client-contract-pending.md), [`sameday-pickup-schedule-alert-client-credit-insufficient.md`](sameday-pickup-schedule-alert-client-credit-insufficient.md), [`sameday-pickup-schedule-alert-client-delivered.md`](sameday-pickup-schedule-alert-client-delivered.md), [`sameday-pickup-schedule-alert-client-delivery-failed.md`](sameday-pickup-schedule-alert-client-delivery-failed.md), [`sameday-pickup-schedule-alert-client-out-for-delivery.md`](sameday-pickup-schedule-alert-client-out-for-delivery.md), [`sameday-pickup-schedule-alert-client-payment-received.md`](sameday-pickup-schedule-alert-client-payment-received.md), [`sameday-pickup-schedule-alert-client-payment-reminder.md`](sameday-pickup-schedule-alert-client-payment-reminder.md), [`sameday-pickup-schedule-alert-client-return-created.md`](sameday-pickup-schedule-alert-client-return-created.md), [`sameday-pickup-schedule-alert-client-shipped.md`](sameday-pickup-schedule-alert-client-shipped.md), [`sameday-pickup-schedule-alert-internal-compliance-issue.md`](sameday-pickup-schedule-alert-internal-compliance-issue.md), [`sameday-pickup-schedule-alert-internal-contract-signed.md`](sameday-pickup-schedule-alert-internal-contract-signed.md), [`sameday-pickup-schedule-alert-internal-credit-blocked.md`](sameday-pickup-schedule-alert-internal-credit-blocked.md), [`sameday-pickup-schedule-alert-internal-daily-summary.md`](sameday-pickup-schedule-alert-internal-daily-summary.md), [`sameday-pickup-schedule-alert-internal-insolvency-detected.md`](sameday-pickup-schedule-alert-internal-insolvency-detected.md), [`sameday-pickup-schedule-alert-internal-oblio-sync-failed.md`](sameday-pickup-schedule-alert-internal-oblio-sync-failed.md), [`sameday-pickup-schedule-alert-internal-return-received.md`](sameday-pickup-schedule-alert-internal-return-received.md), [`sameday-pickup-schedule-alert-internal-stock-insufficient.md`](sameday-pickup-schedule-alert-internal-stock-insufficient.md), [`sameday-pickup-schedule-alert-internal-storno-failed.md`](sameday-pickup-schedule-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-pickup-schedule` → `e4-logistics`.
- **Semantic:** matrice **`sameday:pickup:schedule`**, rând **236**.

## Limite și reconcilieri

- **`e4-logistics`** agregat ≠ `nodeKey` sursă; vezi ADR logistics.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-pickup-schedule-family\``.
