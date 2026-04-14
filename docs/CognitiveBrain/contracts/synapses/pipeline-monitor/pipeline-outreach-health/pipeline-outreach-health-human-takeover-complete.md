# Sinapsă `pipeline-outreach-health-human-takeover-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-health-human-takeover-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-health/pipeline-outreach-health-human-takeover-complete.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-outreach-health` | [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). **Runtime:** `pipeline:outreach:health` (`QUEUES.PIPELINE_OUTREACH_HEALTH`, `queue-registry.ts` ~L182). |
| Destinație (graf) | `human-takeover-complete` | [`../../../neurons/E2/human--takeover--complete.md`](../../../neurons/E2/human--takeover--complete.md). **Runtime:** `human:takeover:complete` (`QUEUES.HUMAN_TAKEOVER_COMPLETE`, `queue-registry.ts` ~L174). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Dependență planificată de la **outreach health** către finalizarea **takeover** uman. Exportul nu specifică semantica operațională (ex. reluare conversație, închidere task); nu inventăm.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:outreach:health` → `human:takeover:complete`.
- **Semantic (ADR-0002):** `e2:pipeline:outreach-health`; `e2:human:takeover-complete`.
- **Planificare:** v2 §7 — `pipeline-outreach-health` → `human-takeover-complete`.

## Limite și reconcilieri

- Slug graf vs coadă `human:takeover:complete`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-health-human-takeover-complete\``.
