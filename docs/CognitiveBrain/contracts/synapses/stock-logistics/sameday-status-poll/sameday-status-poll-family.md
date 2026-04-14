# Sinapsă `sameday-status-poll-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-status-poll-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-status-poll/sameday-status-poll-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-status-poll` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-status-poll` | Traseu în graf; contract neuron: [`../../../neurons/E4/sameday--status--poll.md`](../../../neurons/E4/sameday--status--poll.md). **Triplă autoritate:** v2 **`sameday:status:poll`**; **`e4:sameday:status-poll`**; matrice rând **238** — vezi neuron și registry. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4**. [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează **sameday-status-poll** sub **`e4-logistics`**. v2: **„specializează familia**” — fără payload/retry/safety/telemetrie per-muchie în registru.

## Sinapse dependență în același traseu

[`sameday-status-poll-alert-client-account-blocked.md`](sameday-status-poll-alert-client-account-blocked.md), [`sameday-status-poll-alert-client-contract-pending.md`](sameday-status-poll-alert-client-contract-pending.md), [`sameday-status-poll-alert-client-credit-insufficient.md`](sameday-status-poll-alert-client-credit-insufficient.md), [`sameday-status-poll-alert-client-delivered.md`](sameday-status-poll-alert-client-delivered.md), [`sameday-status-poll-alert-client-delivery-failed.md`](sameday-status-poll-alert-client-delivery-failed.md), [`sameday-status-poll-alert-client-out-for-delivery.md`](sameday-status-poll-alert-client-out-for-delivery.md), [`sameday-status-poll-alert-client-payment-received.md`](sameday-status-poll-alert-client-payment-received.md), [`sameday-status-poll-alert-client-payment-reminder.md`](sameday-status-poll-alert-client-payment-reminder.md), [`sameday-status-poll-alert-client-return-created.md`](sameday-status-poll-alert-client-return-created.md), [`sameday-status-poll-alert-client-shipped.md`](sameday-status-poll-alert-client-shipped.md), [`sameday-status-poll-alert-internal-compliance-issue.md`](sameday-status-poll-alert-internal-compliance-issue.md), [`sameday-status-poll-alert-internal-contract-signed.md`](sameday-status-poll-alert-internal-contract-signed.md), [`sameday-status-poll-alert-internal-credit-blocked.md`](sameday-status-poll-alert-internal-credit-blocked.md), [`sameday-status-poll-alert-internal-daily-summary.md`](sameday-status-poll-alert-internal-daily-summary.md), [`sameday-status-poll-alert-internal-insolvency-detected.md`](sameday-status-poll-alert-internal-insolvency-detected.md), [`sameday-status-poll-alert-internal-oblio-sync-failed.md`](sameday-status-poll-alert-internal-oblio-sync-failed.md), [`sameday-status-poll-alert-internal-return-received.md`](sameday-status-poll-alert-internal-return-received.md), [`sameday-status-poll-alert-internal-stock-insufficient.md`](sameday-status-poll-alert-internal-stock-insufficient.md), [`sameday-status-poll-alert-internal-storno-failed.md`](sameday-status-poll-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-status-poll` → `e4-logistics`.
- **Semantic:** matrice **`sameday:status:poll`**, rând **238**.
- **Runtime:** vezi contractul neuron.

## Limite și reconcilieri

- **`e4-logistics`** ≠ `e4:sameday:status-poll`; reconciliere prin ADR + neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-status-poll-family\``.
