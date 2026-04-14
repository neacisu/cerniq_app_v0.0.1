# Sinapsă `sameday-cod-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-cod-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-cod-process/sameday-cod-process-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-cod-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-cod-process` | Traseu în graf; contract neuron: [`../../../neurons/E4/sameday--cod--process.md`](../../../neurons/E4/sameday--cod--process.md). **Triplă autoritate:** v2 **`sameday:cod:process`**; **`e4:sameday:cod-process`**; matrice rând **235** — vezi neuron și registry. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4**. [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **sameday-cod-process** sub **`e4-logistics`**. v2: **„specializează familia**” — fără payload/retry/safety/telemetrie per-muchie în registru.

## Sinapse dependență în același traseu

[`sameday-cod-process-alert-client-account-blocked.md`](sameday-cod-process-alert-client-account-blocked.md), [`sameday-cod-process-alert-client-contract-pending.md`](sameday-cod-process-alert-client-contract-pending.md), [`sameday-cod-process-alert-client-credit-insufficient.md`](sameday-cod-process-alert-client-credit-insufficient.md), [`sameday-cod-process-alert-client-delivered.md`](sameday-cod-process-alert-client-delivered.md), [`sameday-cod-process-alert-client-delivery-failed.md`](sameday-cod-process-alert-client-delivery-failed.md), [`sameday-cod-process-alert-client-out-for-delivery.md`](sameday-cod-process-alert-client-out-for-delivery.md), [`sameday-cod-process-alert-client-payment-received.md`](sameday-cod-process-alert-client-payment-received.md), [`sameday-cod-process-alert-client-payment-reminder.md`](sameday-cod-process-alert-client-payment-reminder.md), [`sameday-cod-process-alert-client-return-created.md`](sameday-cod-process-alert-client-return-created.md), [`sameday-cod-process-alert-client-shipped.md`](sameday-cod-process-alert-client-shipped.md), [`sameday-cod-process-alert-internal-compliance-issue.md`](sameday-cod-process-alert-internal-compliance-issue.md), [`sameday-cod-process-alert-internal-contract-signed.md`](sameday-cod-process-alert-internal-contract-signed.md), [`sameday-cod-process-alert-internal-credit-blocked.md`](sameday-cod-process-alert-internal-credit-blocked.md), [`sameday-cod-process-alert-internal-daily-summary.md`](sameday-cod-process-alert-internal-daily-summary.md), [`sameday-cod-process-alert-internal-insolvency-detected.md`](sameday-cod-process-alert-internal-insolvency-detected.md), [`sameday-cod-process-alert-internal-oblio-sync-failed.md`](sameday-cod-process-alert-internal-oblio-sync-failed.md), [`sameday-cod-process-alert-internal-return-received.md`](sameday-cod-process-alert-internal-return-received.md), [`sameday-cod-process-alert-internal-stock-insufficient.md`](sameday-cod-process-alert-internal-stock-insufficient.md), [`sameday-cod-process-alert-internal-storno-failed.md`](sameday-cod-process-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-cod-process` → `e4-logistics`.
- **Semantic:** matrice **`sameday:cod:process`**, rând **235**.
- **Runtime:** vezi contractul neuron.

## Limite și reconcilieri

- **`e4-logistics`** ≠ `e4:sameday:cod-process`; reconciliere prin ADR + neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-cod-process-family\``.
