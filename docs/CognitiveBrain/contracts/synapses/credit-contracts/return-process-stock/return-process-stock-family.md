# Sinapsă `return-process-stock-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `return-process-stock-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/return-process-stock/return-process-stock-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `return-process-stock` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `return-process-stock` | Traseu în graf; contract neuron: [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Triplă autoritate:** v2 folosește eticheta/coada `return:process:stock`; runtime canonic citit în neuron este **`return:process`** — vezi neuron pentru dovadă și limită. |
| Destinație (graf) | `e4-logistics` | Agregat **familie logistics E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **return-process-stock** sub agregatul **`e4-logistics`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`return-process-stock-alert-client-account-blocked.md`](return-process-stock-alert-client-account-blocked.md), [`return-process-stock-alert-client-contract-pending.md`](return-process-stock-alert-client-contract-pending.md), [`return-process-stock-alert-client-credit-insufficient.md`](return-process-stock-alert-client-credit-insufficient.md), [`return-process-stock-alert-client-delivered.md`](return-process-stock-alert-client-delivered.md), [`return-process-stock-alert-client-delivery-failed.md`](return-process-stock-alert-client-delivery-failed.md), [`return-process-stock-alert-client-out-for-delivery.md`](return-process-stock-alert-client-out-for-delivery.md), [`return-process-stock-alert-client-payment-received.md`](return-process-stock-alert-client-payment-received.md), [`return-process-stock-alert-client-payment-reminder.md`](return-process-stock-alert-client-payment-reminder.md), [`return-process-stock-alert-client-return-created.md`](return-process-stock-alert-client-return-created.md), [`return-process-stock-alert-client-shipped.md`](return-process-stock-alert-client-shipped.md), [`return-process-stock-alert-internal-compliance-issue.md`](return-process-stock-alert-internal-compliance-issue.md), [`return-process-stock-alert-internal-contract-signed.md`](return-process-stock-alert-internal-contract-signed.md), [`return-process-stock-alert-internal-credit-blocked.md`](return-process-stock-alert-internal-credit-blocked.md), [`return-process-stock-alert-internal-daily-summary.md`](return-process-stock-alert-internal-daily-summary.md), [`return-process-stock-alert-internal-insolvency-detected.md`](return-process-stock-alert-internal-insolvency-detected.md), [`return-process-stock-alert-internal-oblio-sync-failed.md`](return-process-stock-alert-internal-oblio-sync-failed.md), [`return-process-stock-alert-internal-return-received.md`](return-process-stock-alert-internal-return-received.md), [`return-process-stock-alert-internal-stock-insufficient.md`](return-process-stock-alert-internal-stock-insufficient.md), [`return-process-stock-alert-internal-storno-failed.md`](return-process-stock-alert-internal-storno-failed.md).

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

- **Runtime (ADR-0001):** `e4-logistics` nu este cheie în `QUEUES`; traseul se ancorează în cozi/logistica E4 prin [`return--process--stock.md`](../../../neurons/E4/return--process--stock.md).
- **Semantic (ADR-0002):** familia `logistics` (v2), nod catalog `e4:return:process` — vezi neuron.
- **Planificare:** v2 §7 — `return-process-stock` → `e4-logistics`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Muchiile din alte foldere care au ca destinație `return-process-stock` (ex. pași contract) sunt sinapse **distincte** în v2 §7 — nu le confunda cu manifestul de familie.
- Slug graf `return-process-stock` vs literal registry: **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`return-process-stock-family\``.
