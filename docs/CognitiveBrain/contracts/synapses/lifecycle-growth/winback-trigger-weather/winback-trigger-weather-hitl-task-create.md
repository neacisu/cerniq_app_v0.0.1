# Sinapsă `winback-trigger-weather-hitl-task-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `winback-trigger-weather-hitl-task-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/winback-trigger-weather/winback-trigger-weather-hitl-task-create.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `winback-trigger-weather` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `winback-trigger-weather` | **Contract:** [`../../../neurons/E5/winback--trigger--weather.md`](../../../neurons/E5/winback--trigger--weather.md). |
| Destinație (graf) | `hitl-task-create` | **Contract:** [`../../../neurons/E5/hitl--task--create.md`](../../../neurons/E5/hitl--task--create.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **winback-trigger-weather** are dependență sintactică față de **hitl-task-create**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `winback-trigger-weather` → `hitl-task-create`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron sursă și țintă.

## Limite și reconcilieri

- **E5 sursă → E5 țintă HITL:** ambele contracte sunt sub etapa E5; execuția concretă rămâne sub incidenta registry și a handlerilor citați în neuroni.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`winback-trigger-weather-hitl-task-create\``.
