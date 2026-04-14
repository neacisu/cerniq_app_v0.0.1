# Sinapsă `payment-refund-process-credit-data-fetch-insolventa`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-refund-process-credit-data-fetch-insolventa` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-refund-process/payment-refund-process-credit-data-fetch-insolventa.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-refund-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-refund-process` | **Runtime:** **`revolut:refund:process`**. **Contract:** [`../../../neurons/E4/payment--refund--process.md`](../../../neurons/E4/payment--refund--process.md). |
| Destinație (graf) | `credit-data-fetch-insolventa` | **Contract:** [`../../../neurons/E4/credit--data--fetch-insolventa.md`](../../../neurons/E4/credit--data--fetch-insolventa.md). **Matrix:** `queue_in_registry` = **no** pentru `credit:data:fetch-insolventa` — execuția țintă necesită audit neuron, nu inferență din graf. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **procesarea rambursării** este ordonată canonic față de **fetch insolvență**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime:** sursă în registry ca **`revolut:refund:process`**; ținta poate lipsi ca literal registry — vezi neuron.
- **Planificare:** muchie structurală export-grounded.

## Limite și reconcilieri

- **Dublu gap posibil:** reconciliere refund Revolut + gap credit insolvență — ambele documentate la neuroni.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-refund-process-credit-data-fetch-insolventa\``.
