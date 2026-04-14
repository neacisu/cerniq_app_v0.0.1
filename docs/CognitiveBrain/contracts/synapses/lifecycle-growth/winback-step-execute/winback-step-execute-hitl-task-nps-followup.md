# Sinapsă `winback-step-execute-hitl-task-nps-followup`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-step-execute-hitl-task-nps-followup` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-step-execute/winback-step-execute-hitl-task-nps-followup.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-step-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-step-execute` | **Contract:** [`../../../neurons/E5/winback--step--execute.md`](../../../neurons/E5/winback--step--execute.md). **Runtime:** `winback:step:execute` (F33). |
| Destinație (graf) | `hitl-task-nps-followup` | **Contract:** [`../../../neurons/E5/hitl--task--nps-followup.md`](../../../neurons/E5/hitl--task--nps-followup.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-step-execute** are dependență sintactică față de **hitl-task-nps-followup**. v2: **sinapsă canonică de pipeline**; exportul **nu** fixează payload sau ordinea operațională între job-uri.

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

- **Planificare:** v2 §7 — `winback-step-execute` → `hitl-task-nps-followup`.
- **Runtime:** sursă — F33; destinație — vezi neuron `hitl-task-nps-followup`.

## Limite și reconcilieri

- Noduri HITL: verificare registry/catalog în contractul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-step-execute-hitl-task-nps-followup\``.
