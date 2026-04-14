# Sinapsă `return-request-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `return-request-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/return-request-create/return-request-create-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `return-request-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `return-request-create` | Traseu în graf; contract neuron: [`../../../neurons/E4/return--request--create.md`](../../../neurons/E4/return--request--create.md). **Triplă autoritate:** v2 folosește **`return:request:create`**; runtime canonic citit în neuron este **`return:initiate`** — vezi neuron pentru dovadă și limită. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **return-request-create** sub agregatul **`e4-logistics`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`return-request-create-alert-client-account-blocked.md`](return-request-create-alert-client-account-blocked.md), [`return-request-create-alert-client-contract-pending.md`](return-request-create-alert-client-contract-pending.md), [`return-request-create-alert-client-credit-insufficient.md`](return-request-create-alert-client-credit-insufficient.md), [`return-request-create-alert-client-delivered.md`](return-request-create-alert-client-delivered.md), [`return-request-create-alert-client-delivery-failed.md`](return-request-create-alert-client-delivery-failed.md), [`return-request-create-alert-client-out-for-delivery.md`](return-request-create-alert-client-out-for-delivery.md), [`return-request-create-alert-client-payment-received.md`](return-request-create-alert-client-payment-received.md), [`return-request-create-alert-client-payment-reminder.md`](return-request-create-alert-client-payment-reminder.md), [`return-request-create-alert-client-return-created.md`](return-request-create-alert-client-return-created.md), [`return-request-create-alert-client-shipped.md`](return-request-create-alert-client-shipped.md), [`return-request-create-alert-internal-compliance-issue.md`](return-request-create-alert-internal-compliance-issue.md), [`return-request-create-alert-internal-contract-signed.md`](return-request-create-alert-internal-contract-signed.md), [`return-request-create-alert-internal-credit-blocked.md`](return-request-create-alert-internal-credit-blocked.md), [`return-request-create-alert-internal-daily-summary.md`](return-request-create-alert-internal-daily-summary.md), [`return-request-create-alert-internal-insolvency-detected.md`](return-request-create-alert-internal-insolvency-detected.md), [`return-request-create-alert-internal-oblio-sync-failed.md`](return-request-create-alert-internal-oblio-sync-failed.md), [`return-request-create-alert-internal-return-received.md`](return-request-create-alert-internal-return-received.md), [`return-request-create-alert-internal-stock-insufficient.md`](return-request-create-alert-internal-stock-insufficient.md), [`return-request-create-alert-internal-storno-failed.md`](return-request-create-alert-internal-storno-failed.md).

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

- **Runtime (ADR-0001):** `e4-logistics` nu este cheie în `QUEUES`; traseul se ancorează în cozi/logistica E4 prin [`return--request--create.md`](../../../neurons/E4/return--request--create.md).
- **Semantic (ADR-0002):** familia `logistics` (v2), nod catalog `e4:return:initiate` — vezi neuron.
- **Planificare:** v2 §7 — `return-request-create` → `e4-logistics`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Muchiile din alte foldere care au cațintă `return-request-create` (ex. pași contract) sunt sinapse **distincte** în v2 §7 — nu le confunda cu manifestul de familie.
- Slug graf `return-request-create` vs literal registry **`return:initiate`**: **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`return-request-create-family\``.
