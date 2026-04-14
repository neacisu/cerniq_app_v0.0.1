# Sinapsă `pipeline-outreach-health-human-approve-message`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-health-human-approve-message` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-health/pipeline-outreach-health-human-approve-message.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-outreach-health` | [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). **Runtime:** `pipeline:outreach:health` (`QUEUES.PIPELINE_OUTREACH_HEALTH`, `queue-registry.ts` ~L182). |
| Țintă | `human-approve-message` | [`../../../neurons/E2/human--approve--message.md`](../../../neurons/E2/human--approve--message.md). **Runtime:** `human:approve:message` (`QUEUES.HUMAN_APPROVE_MESSAGE`, `queue-registry.ts` ~L175). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, fluxul de **monitorizare sănătate outreach** depinde de **aprobarea mesajului** (HITL). Exportul nu descrie condițiile exacte de enqueuing sau corelația cu starea outreach; nu completăm.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:outreach:health` → `human:approve:message`.
- **Semantic (ADR-0002):** `e2:pipeline:outreach-health`; `e2:human:approve-message` (`NEURON_MATRIX.csv`).
- **Planificare:** v2 §7 — `pipeline-outreach-health` → `human-approve-message`.

## Limite și reconcilieri

- Slug graf `human-approve-message` vs coadă `human:approve:message`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-health-human-approve-message\``.
