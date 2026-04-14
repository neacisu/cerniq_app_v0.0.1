# Sinapsă `reconcile-daily-unmatched-credit-data-fetch-dosare`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-daily-unmatched-credit-data-fetch-dosare` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-daily-unmatched/reconcile-daily-unmatched-credit-data-fetch-dosare.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-daily-unmatched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-daily-unmatched` | **Execuție:** [`../../../neurons/E4/reconcile--daily--unmatched.md`](../../../neurons/E4/reconcile--daily--unmatched.md). |
| Destinație (graf) | `credit-data-fetch-dosare` | **Registry:** **`credit:data:fetch-dosare`**. **Contract:** [`../../../neurons/E4/credit--data--fetch-dosare.md`](../../../neurons/E4/credit--data--fetch-dosare.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **`reconcile-daily-unmatched`** și **fetch dosare**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime:** țintă conform registry; sursă — reconciliere neuron.
- **Planificare:** v2 §7.

## Limite și reconcilieri

- Mapare dosare ↔ BPI posibilă — vezi neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-daily-unmatched-credit-data-fetch-dosare\``.
