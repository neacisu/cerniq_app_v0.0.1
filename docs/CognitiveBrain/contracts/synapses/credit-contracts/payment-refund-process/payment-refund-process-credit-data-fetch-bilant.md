# Sinapsă `payment-refund-process-credit-data-fetch-bilant`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-refund-process-credit-data-fetch-bilant` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-refund-process/payment-refund-process-credit-data-fetch-bilant.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-refund-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-refund-process` | **Runtime:** **`revolut:refund:process`**. **Contract:** [`../../../neurons/E4/payment--refund--process.md`](../../../neurons/E4/payment--refund--process.md). |
| Destinație (graf) | `credit-data-fetch-bilant` | **Registry:** **`credit:data:fetch-bilant`**. **Contract:** [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **procesarea rambursării** este ordonată canonic față de **fetch bilanț credit**. v2: **„sinapsă canonică de pipeline”**.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime / semantic:** vezi contractele neuron pentru ambele capete.
- **Planificare:** muchie structurală între traseul refund și date bilanț.

## Limite și reconcilieri

- Graf **`payment-refund-process`** ≠ literal **`payment:refund:process`** ca și coadă executată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-refund-process-credit-data-fetch-bilant\``.
