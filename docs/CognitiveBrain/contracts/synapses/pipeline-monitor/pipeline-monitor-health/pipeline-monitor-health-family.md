# Sinapsă `pipeline-monitor-health-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-monitor-health-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-monitor-health/pipeline-monitor-health-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-monitor-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-monitor-health` | Traseu în graf; [`../../../neurons/E1/pipeline--monitor--health.md`](../../../neurons/E1/pipeline--monitor--health.md). **v2 / matrice:** `pipeline:monitor:health`. **Runtime (ADR-0001):** **o singură** coadă executabilă `pipeline:monitor` (`QUEUES.PIPELINE_MONITOR`, `workers/shared/src/queue-registry.ts` ~L86); worker `p3-pipeline-monitor.ts` acoperă și «health» și (împreună cu rate-sync) aceeași coadă — vezi contractul neuron. |
| Țintă | `e1-monitor` | Nod agregat **familie monitor** E1 în planificare; **nu** este o singură coadă executabilă; vezi [`../../../adr/families/e1/monitor.md`](../../../adr/families/e1/monitor.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `pipeline-monitor-health` sub agregatul **`e1-monitor`** în graful de planificare. În runtime, capabilitatea de «sănătate» este parte din procesorul unic pe `pipeline:monitor`, nu dintr-o coadă cu numele v2 — detaliu în contractul neuron, nu în câmpurile sinapsei din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** coada executabilă `pipeline:monitor`; `e1-monitor` nu este nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e1:pipeline:monitor` / `pipeline:monitor` în catalog (vezi contract neuron).
- **Planificare:** v2 §7 — `pipeline-monitor-health` → `e1-monitor`.

## Limite și reconcilieri

- **Două capete v2 (`health` / `rate-sync`) → o coadă `pipeline:monitor`** — vezi [`../../../neurons/E1/pipeline--monitor--health.md`](../../../neurons/E1/pipeline--monitor--health.md).
- Slug graf `pipeline-monitor-health` vs șir coadă `pipeline:monitor`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-monitor-health-family\``.
