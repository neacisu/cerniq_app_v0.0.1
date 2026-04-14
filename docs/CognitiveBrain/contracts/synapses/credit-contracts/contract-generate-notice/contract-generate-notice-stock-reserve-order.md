# Sinapsă `contract-generate-notice-stock-reserve-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-notice-stock-reserve-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-notice/contract-generate-notice-stock-reserve-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-notice` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-generate-notice` | **Contract:** [`../../../neurons/E4/contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md). **v2:** `contract:generate:notice`. **Runtime / catalog:** gap la neuron — vezi contract. |
| Destinație (graf) | `stock-reserve-order` | **Contract:** [`../../../neurons/E4/stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md). **Runtime / catalog:** graf E4 — vezi contract pentru gap registry / echivalent E3. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **contract-generate-notice** depinde canonic de **`stock-reserve-order`**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** sursa — gap; ținta — reconciliere E4/E3 posibilă — vezi [`stock--reserve--order.md`](../../../neurons/E4/stock--reserve--order.md).
- **Semantic (ADR-0002):** graf notice → E4 rezervare stoc (graf).
- **Planificare:** `contract-generate-notice` → `stock-reserve-order`.

## Limite și reconcilieri

- Sursa traseului — [`contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md); ținta poate necesita reconciliere cu E3.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-notice-stock-reserve-order\``.
