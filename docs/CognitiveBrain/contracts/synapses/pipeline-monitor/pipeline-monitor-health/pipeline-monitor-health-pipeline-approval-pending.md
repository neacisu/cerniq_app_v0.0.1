# Sinapsă `pipeline-monitor-health-pipeline-approval-pending`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-monitor-health-pipeline-approval-pending` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-monitor-health/pipeline-monitor-health-pipeline-approval-pending.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-monitor-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-monitor-health` | [`../../../neurons/E1/pipeline--monitor--health.md`](../../../neurons/E1/pipeline--monitor--health.md). **Runtime:** `pipeline:monitor` (`QUEUES.PIPELINE_MONITOR`, `workers/shared/src/queue-registry.ts` ~L86); span worker `e1:pipeline:monitor` — fără coadă separată `pipeline:monitor:health`. |
| Țintă | `pipeline-approval-pending` | [`../../../neurons/E1/pipeline--approval--pending.md`](../../../neurons/E1/pipeline--approval--pending.md). **v2:** `pipeline:approval:pending`. **Runtime:** contractul neuron documentează **absența** cozii BullMQ cu acest nume; aprobări pending în Postgres + fluxuri `hitl:*`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, traseul de **monitorizare sănătate** este legat prin **dependență** de nodul **approval pending**. Interpretarea operațională exactă (ordonare joburi, condiții de declanșare) **nu** este în câmpurile exportului; în cod, monitorul unic citește încălcări SLA legate de aprobări și poate enfile `hitl:escalate` — aliniere parțială descrisă în contractul `pipeline--monitor--health.md`, nu inventată aici.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:monitor` → **fără** coadă canonică `pipeline:approval:pending` în registry (vezi contract țintă).
- **Semantic (ADR-0002):** `e1:pipeline:monitor`; ținta **fără** `nodeKey` catalog pentru coada v2 la auditul neuronului.
- **Planificare:** v2 §7 — `pipeline-monitor-health` → `pipeline-approval-pending`.

## Limite și reconcilieri

- **Dependență graf** între două noduri care în runtime **nu** sunt două cozi 1:1 cu numele din v2 — reconciliere obligatorie prin contracte neuron.
- Slug-uri graf (`pipeline-monitor-health`, `pipeline-approval-pending`) vs `pipeline:monitor` / model Postgres+HITL.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-monitor-health-pipeline-approval-pending\``.
