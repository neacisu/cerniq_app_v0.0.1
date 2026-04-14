# Sinapsă `reconcile-overdue-check-credit-data-fetch-anaf`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-overdue-check-credit-data-fetch-anaf` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-overdue-check/reconcile-overdue-check-credit-data-fetch-anaf.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-overdue-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-overdue-check` | **Execuție:** vezi [`../../../neurons/E4/reconcile--overdue--check.md`](../../../neurons/E4/reconcile--overdue--check.md) — `payment:overdue:detect` / B12, nu literal graf. |
| Destinație (graf) | `credit-data-fetch-anaf` | **Registry:** **`credit:data:fetch-anaf`**. **Contract:** [`../../../neurons/E4/credit--data--fetch-anaf.md`](../../../neurons/E4/credit--data--fetch-anaf.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **`reconcile-overdue-check`** și **fetch ANAF**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime / planificare:** vezi contracte neuron.

## Limite și reconcilieri

- Sursă: reconciliere graf ↔ `payment:overdue:*`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-overdue-check-credit-data-fetch-anaf\``.
