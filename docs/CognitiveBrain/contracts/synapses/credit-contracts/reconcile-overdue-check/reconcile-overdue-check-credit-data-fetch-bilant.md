# Sinapsă `reconcile-overdue-check-credit-data-fetch-bilant`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-overdue-check-credit-data-fetch-bilant` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-overdue-check/reconcile-overdue-check-credit-data-fetch-bilant.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-overdue-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-overdue-check` | **Execuție:** [`../../../neurons/E4/reconcile--overdue--check.md`](../../../neurons/E4/reconcile--overdue--check.md). |
| Destinație (graf) | `credit-data-fetch-bilant` | **Registry:** **`credit:data:fetch-bilant`**. **Contract:** [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **`reconcile-overdue-check`** și **fetch bilanț**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime:** țintă în registry; sursă — B11/B12.
- **Planificare:** v2 §7.

## Limite și reconcilieri

- Graf `reconcile-overdue-check` ≠ coadă registry același nume.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-overdue-check-credit-data-fetch-bilant\``.
