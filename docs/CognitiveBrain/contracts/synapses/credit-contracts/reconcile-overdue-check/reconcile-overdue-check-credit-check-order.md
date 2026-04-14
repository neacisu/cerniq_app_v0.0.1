# Sinapsă `reconcile-overdue-check-credit-check-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-overdue-check-credit-check-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-overdue-check/reconcile-overdue-check-credit-check-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-overdue-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-overdue-check` | **Graf:** `reconcile-overdue-check`. **Execuție:** **nu** este `reconcile:overdue:check` în registry — vezi [`../../../neurons/E4/reconcile--overdue--check.md`](../../../neurons/E4/reconcile--overdue--check.md); echivalent **`payment:overdue:detect`** / B12. |
| Destinație (graf) | `credit-check-order` | **Registry:** **`credit:check:order`**. **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **`reconcile-overdue-check`** și **`credit-check-order`**. v2: **„sinapsă canonică de pipeline”**. Legătura operațională efectivă trece prin workerii B11/B12 — nu prin registrul sinapsei.

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

- **Runtime:** țintă în registry; sursă — reconciliere overdue.
- **Planificare:** topologie v2 §7.

## Limite și reconcilieri

- Nu căutați `reconcile:overdue:check` ca literal în `queue-registry.ts` fără neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-overdue-check-credit-check-order\``.
