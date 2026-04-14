# Sinapsă `payment-refund-process-credit-check-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-refund-process-credit-check-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-refund-process/payment-refund-process-credit-check-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-refund-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-refund-process` | **Graf / v2:** `payment-refund-process`. **Runtime (ADR-0001):** **`revolut:refund:process`** — vezi [`../../../neurons/E4/payment--refund--process.md`](../../../neurons/E4/payment--refund--process.md). |
| Destinație (graf) | `credit-check-order` | **Registry:** **`credit:check:order`**. **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **procesarea rambursării** (nod plan `payment-refund-process`) este ordonată canonic față de **verificarea creditului la comandă**. v2: **„sinapsă canonică de pipeline”** — execuția sursei pe coada Revolut este documentată separat de eticheta graf.

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

- **Runtime (ADR-0001):** sursă executabilă **`revolut:refund:process`**; destinație **`credit:check:order`** — ambele verificabile în registry dacă incluse.
- **Semantic (ADR-0002):** `e4:revolut:refund-process` vs catalog destinație — vezi contracte neuron.
- **Planificare:** dependență cash/refund → credit.

## Limite și reconcilieri

- Nu folosiți **`payment:refund:process`** ca nume de coadă în runtime fără a citi registry-ul; prevală **`revolut:refund:process`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-refund-process-credit-check-order\``.
