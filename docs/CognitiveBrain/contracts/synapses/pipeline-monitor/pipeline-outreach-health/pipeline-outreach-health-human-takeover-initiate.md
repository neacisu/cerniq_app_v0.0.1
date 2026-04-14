# Sinapsă `pipeline-outreach-health-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-health-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-health/pipeline-outreach-health-human-takeover-initiate.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-outreach-health` | [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). **Runtime:** `pipeline:outreach:health` (`QUEUES.PIPELINE_OUTREACH_HEALTH`, `queue-registry.ts` ~L182). |
| Destinație (graf) | `human-takeover-initiate` | [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Runtime:** `human:takeover:initiate` (`QUEUES.HUMAN_TAKEOVER_INITIATE`, `queue-registry.ts` ~L173). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, **outreach health** depinde de **inițierea takeover** uman. Condițiile concrete de escaladare nu sunt în registrul §7; rămân la implementare și la contractele neuron.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:outreach:health` → `human:takeover:initiate`.
- **Semantic (ADR-0002):** `e2:pipeline:outreach-health`; `e2:human:takeover-initiate`.
- **Planificare:** v2 §7 — `pipeline-outreach-health` → `human-takeover-initiate`.

## Limite și reconcilieri

- Slug graf vs coadă `human:takeover:initiate`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-health-human-takeover-initiate\``.
