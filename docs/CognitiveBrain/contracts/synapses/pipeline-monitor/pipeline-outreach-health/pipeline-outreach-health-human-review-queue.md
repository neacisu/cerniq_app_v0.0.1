# Sinapsă `pipeline-outreach-health-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-health-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-health/pipeline-outreach-health-human-review-queue.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-outreach-health` | [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). **Runtime:** `pipeline:outreach:health` (`QUEUES.PIPELINE_OUTREACH_HEALTH`, `queue-registry.ts` ~L182). |
| Țintă | `human-review-queue` | [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). **Runtime:** `human:review:queue` (`QUEUES.HUMAN_REVIEW_QUEUE`, `queue-registry.ts` ~L171). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graf, **sănătatea outreach** depinde de **coada de review uman**. Fără detaliu în export despre când se materializează această dependență în BullMQ; interpretarea rămâne la contractele neuron și la implementare.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:outreach:health` → `human:review:queue`.
- **Semantic (ADR-0002):** `e2:pipeline:outreach-health`; `e2:human:review-queue`.
- **Planificare:** v2 §7 — `pipeline-outreach-health` → `human-review-queue`.

## Limite și reconcilieri

- Slug graf vs coadă `human:review:queue`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-health-human-review-queue\``.
