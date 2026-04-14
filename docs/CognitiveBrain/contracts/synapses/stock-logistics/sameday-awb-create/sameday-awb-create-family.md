# Sinapsă `sameday-awb-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-awb-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-awb-create/sameday-awb-create-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-awb-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `sameday-awb-create` | Traseu în graf; contract neuron: [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Triplă autoritate:** v2 **`sameday:awb:create`**; runtime / semantic canonic **`e4:sameday:awb-create`** — vezi neuron, `queue-registry.ts` și catalog în contractul neuron. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **sameday-awb-create** (creare AWB Sameday în planificare) sub agregatul **`e4-logistics`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`sameday-awb-create-alert-client-account-blocked.md`](sameday-awb-create-alert-client-account-blocked.md), [`sameday-awb-create-alert-client-contract-pending.md`](sameday-awb-create-alert-client-contract-pending.md), [`sameday-awb-create-alert-client-credit-insufficient.md`](sameday-awb-create-alert-client-credit-insufficient.md), [`sameday-awb-create-alert-client-delivered.md`](sameday-awb-create-alert-client-delivered.md), [`sameday-awb-create-alert-client-delivery-failed.md`](sameday-awb-create-alert-client-delivery-failed.md), [`sameday-awb-create-alert-client-out-for-delivery.md`](sameday-awb-create-alert-client-out-for-delivery.md), [`sameday-awb-create-alert-client-payment-received.md`](sameday-awb-create-alert-client-payment-received.md), [`sameday-awb-create-alert-client-payment-reminder.md`](sameday-awb-create-alert-client-payment-reminder.md), [`sameday-awb-create-alert-client-return-created.md`](sameday-awb-create-alert-client-return-created.md), [`sameday-awb-create-alert-client-shipped.md`](sameday-awb-create-alert-client-shipped.md), [`sameday-awb-create-alert-internal-compliance-issue.md`](sameday-awb-create-alert-internal-compliance-issue.md), [`sameday-awb-create-alert-internal-contract-signed.md`](sameday-awb-create-alert-internal-contract-signed.md), [`sameday-awb-create-alert-internal-credit-blocked.md`](sameday-awb-create-alert-internal-credit-blocked.md), [`sameday-awb-create-alert-internal-daily-summary.md`](sameday-awb-create-alert-internal-daily-summary.md), [`sameday-awb-create-alert-internal-insolvency-detected.md`](sameday-awb-create-alert-internal-insolvency-detected.md), [`sameday-awb-create-alert-internal-oblio-sync-failed.md`](sameday-awb-create-alert-internal-oblio-sync-failed.md), [`sameday-awb-create-alert-internal-return-received.md`](sameday-awb-create-alert-internal-return-received.md), [`sameday-awb-create-alert-internal-stock-insufficient.md`](sameday-awb-create-alert-internal-stock-insufficient.md), [`sameday-awb-create-alert-internal-storno-failed.md`](sameday-awb-create-alert-internal-storno-failed.md).

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

- **Planificare:** v2 §7 — `sameday-awb-create` → `e4-logistics`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `sameday:awb:create`, rând **234**; `nodeKey` **`e4:sameday:awb-create`** (coloanele din matrice — vezi fișier).
- **Runtime (ADR-0001):** coadă **`sameday:awb:create`** — vezi contractul neuron și registry.

## Limite și reconcilieri

- **`e4-logistics`** este etichetă de familie în graf, nu înlocuitor pentru `e4:sameday:awb-create`.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-awb-create-family\``.
