# Sinapsă `sameday-status-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-status-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-status-process/sameday-status-process-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-status-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-status-process` | Traseu în graf; contract neuron: [`../../../neurons/E4/sameday--status--process.md`](../../../neurons/E4/sameday--status--process.md). **Triplă autoritate:** v2 **`sameday:status:process`**; runtime / semantic canonic **`e4:sameday:status-process`**, coadă **`sameday:status:process`** (`E4_SAMEDAY_STATUS_PROCESS`, `queue-registry.ts` ~L410) — vezi contractul neuron pentru audit OTel. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **sameday-status-process** (procesare status expediere Sameday în planificare) sub agregatul **`e4-logistics`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`sameday-status-process-alert-client-account-blocked.md`](sameday-status-process-alert-client-account-blocked.md), [`sameday-status-process-alert-client-contract-pending.md`](sameday-status-process-alert-client-contract-pending.md), [`sameday-status-process-alert-client-credit-insufficient.md`](sameday-status-process-alert-client-credit-insufficient.md), [`sameday-status-process-alert-client-delivered.md`](sameday-status-process-alert-client-delivered.md), [`sameday-status-process-alert-client-delivery-failed.md`](sameday-status-process-alert-client-delivery-failed.md), [`sameday-status-process-alert-client-out-for-delivery.md`](sameday-status-process-alert-client-out-for-delivery.md), [`sameday-status-process-alert-client-payment-received.md`](sameday-status-process-alert-client-payment-received.md), [`sameday-status-process-alert-client-payment-reminder.md`](sameday-status-process-alert-client-payment-reminder.md), [`sameday-status-process-alert-client-return-created.md`](sameday-status-process-alert-client-return-created.md), [`sameday-status-process-alert-client-shipped.md`](sameday-status-process-alert-client-shipped.md), [`sameday-status-process-alert-internal-compliance-issue.md`](sameday-status-process-alert-internal-compliance-issue.md), [`sameday-status-process-alert-internal-contract-signed.md`](sameday-status-process-alert-internal-contract-signed.md), [`sameday-status-process-alert-internal-credit-blocked.md`](sameday-status-process-alert-internal-credit-blocked.md), [`sameday-status-process-alert-internal-daily-summary.md`](sameday-status-process-alert-internal-daily-summary.md), [`sameday-status-process-alert-internal-insolvency-detected.md`](sameday-status-process-alert-internal-insolvency-detected.md), [`sameday-status-process-alert-internal-oblio-sync-failed.md`](sameday-status-process-alert-internal-oblio-sync-failed.md), [`sameday-status-process-alert-internal-return-received.md`](sameday-status-process-alert-internal-return-received.md), [`sameday-status-process-alert-internal-stock-insufficient.md`](sameday-status-process-alert-internal-stock-insufficient.md), [`sameday-status-process-alert-internal-storno-failed.md`](sameday-status-process-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-status-process` → `e4-logistics`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `sameday:status:process`, rând **239**; `nodeKey` **`e4:sameday:status-process`** (vezi coloanele din matrice).
- **Runtime (ADR-0001):** coadă **`sameday:status:process`** — vezi contractul neuron și registry.

## Limite și reconcilieri

- **`e4-logistics`** este etichetă de familie în graf, nu înlocuitor pentru `e4:sameday:status-process`.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-status-process-family\``.
