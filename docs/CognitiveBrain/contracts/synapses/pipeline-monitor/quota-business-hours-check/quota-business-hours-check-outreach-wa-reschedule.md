# Sinapsă `quota-business-hours-check-outreach-wa-reschedule`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `quota-business-hours-check-outreach-wa-reschedule` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/quota-business-hours-check/quota-business-hours-check-outreach-wa-reschedule.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `quota-business-hours-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `quota-business-hours-check` | **Contract:** [`../../../neurons/E2/quota--business-hours--check.md`](../../../neurons/E2/quota--business-hours--check.md). **Triplă autoritate:** v2 **`quota:business-hours:check`**; runtime **`e2:quota:business-hours`**. |
| Destinație (graf) | `outreach-wa-reschedule` | **Contract:** [`../../../neurons/E2/outreach--wa--reschedule.md`](../../../neurons/E2/outreach--wa--reschedule.md). **Triplă autoritate:** v2 **`outreach:wa:reschedule`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **94**; **`queue_in_registry` = no** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **quota-business-hours-check** depinde canonic de **outreach-wa-reschedule**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `quota-business-hours-check` → `outreach-wa-reschedule`.
- **Semantic:** ambele **E2**.
- **Runtime:** ținta — gap documentat în matrice (fără intrare registry la nivelul coloanei `queue_in_registry`); vezi neuron.

## Limite și reconcilieri

- Nu confunda **business-hours scheduler** (sursă) cu **wa-reschedule** (destinație): sunt neuroni distincți; legătura este doar cea declarată în export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`quota-business-hours-check-outreach-wa-reschedule\``.
