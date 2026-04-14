# Sinapsă `pipeline-orchestrator-start-pipeline-monitor-rate-sync`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-orchestrator-start-pipeline-monitor-rate-sync` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-orchestrator-start/pipeline-orchestrator-start-pipeline-monitor-rate-sync.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-orchestrator-start` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-orchestrator-start` | [`../../../neurons/E1/pipeline--orchestrator--start.md`](../../../neurons/E1/pipeline--orchestrator--start.md). **Runtime:** `pipeline:orchestrate` (`QUEUES.PIPELINE_ORCHESTRATE`, `queue-registry.ts` ~L83). |
| Destinație (graf) | `pipeline-monitor-rate-sync` | [`../../../neurons/E1/pipeline--monitor--rate-sync.md`](../../../neurons/E1/pipeline--monitor--rate-sync.md). **Runtime:** `pipeline:monitor` (secțiune rate/backlog; fără coadă dedicată). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

**Orchestrator start** depinde în graf de **rate-sync**. Semantica operațională exactă nu este în export; nu o inventăm. Paralel cu muchia «advance» către același tip de destinație (graf).

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:orchestrate` → `pipeline:monitor`.
- **Semantic (ADR-0002):** `e1:pipeline:orchestrate`; `e1:pipeline:monitor`.
- **Planificare:** v2 §7 — `pipeline-orchestrator-start` → `pipeline-monitor-rate-sync`.

## Limite și reconcilieri

- Vezi [`pipeline-orchestrator-advance-pipeline-monitor-rate-sync.md`](../pipeline-orchestrator-advance/pipeline-orchestrator-advance-pipeline-monitor-rate-sync.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-orchestrator-start-pipeline-monitor-rate-sync\``.
