# Sinapsă `pipeline-orchestrator-advance-pipeline-monitor-health`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-orchestrator-advance-pipeline-monitor-health` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-orchestrator-advance/pipeline-orchestrator-advance-pipeline-monitor-health.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-orchestrator-advance` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-orchestrator-advance` | [`../../../neurons/E1/pipeline--orchestrator--advance.md`](../../../neurons/E1/pipeline--orchestrator--advance.md). **Runtime:** `pipeline:orchestrate` (`QUEUES.PIPELINE_ORCHESTRATE`, `queue-registry.ts` ~L83). |
| Țintă | `pipeline-monitor-health` | [`../../../neurons/E1/pipeline--monitor--health.md`](../../../neurons/E1/pipeline--monitor--health.md). **Runtime:** capabilitate «health» în cadrul cozii **`pipeline:monitor`** (`QUEUES.PIPELINE_MONITOR`, ~L86), nu coadă `pipeline:monitor:health`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, **orchestrator advance** depinde de **monitor health**. Exportul nu precizează mecanismul (ex. ordinea joburilor sau condiții de gate); nu completăm. În cod, orchestrarea și monitorizarea sunt cozi distincte (`pipeline:orchestrate` vs `pipeline:monitor`) — relația exactă dintre ele **nu** este derivabilă doar din câmpurile sinapsei v2.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:orchestrate` → `pipeline:monitor` (capabilitate health în același procesor monitor).
- **Semantic (ADR-0002):** `e1:pipeline:orchestrate`; `e1:pipeline:monitor`.
- **Planificare:** v2 §7 — `pipeline-orchestrator-advance` → `pipeline-monitor-health`.

## Limite și reconcilieri

- Nod graf `pipeline-monitor-health` ≠ nume coadă BullMQ; vezi [`../../../neurons/E1/pipeline--monitor--health.md`](../../../neurons/E1/pipeline--monitor--health.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-orchestrator-advance-pipeline-monitor-health\``.
