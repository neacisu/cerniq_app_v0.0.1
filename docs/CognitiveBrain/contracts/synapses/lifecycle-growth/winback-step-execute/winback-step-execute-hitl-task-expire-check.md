# Sinapsă `winback-step-execute-hitl-task-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-step-execute-hitl-task-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-expire-check.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-step-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-step-execute` | **Contract:** [`../../../neurons/E5/winback--step--execute.md`](../../../neurons/E5/winback--step--execute.md). **Runtime:** `winback:step:execute` (F33). |
| Destinație (graf) | `hitl-task-expire-check` | **Contract:** [`../../../neurons/E5/hitl--task--expire-check.md`](../../../neurons/E5/hitl--task--expire-check.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-step-execute** are dependență sintactică față de **hitl-task-expire-check**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `winback-step-execute` → `hitl-task-expire-check`.
- **Runtime:** sursă — F33; țintă — vezi neuron `hitl-task-expire-check`.

## Limite și reconcilieri

- Noduri HITL: verificare registry/catalog în contractul țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-step-execute-hitl-task-expire-check\``.
