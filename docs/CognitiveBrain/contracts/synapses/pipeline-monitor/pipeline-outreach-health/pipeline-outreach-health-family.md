# Sinapsă `pipeline-outreach-health-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-health-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-health/pipeline-outreach-health-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-outreach-health` | Traseu în graf; [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). **v2 / matrice:** `pipeline:outreach:health`. **Runtime (ADR-0001):** `pipeline:outreach:health` (`QUEUES.PIPELINE_OUTREACH_HEALTH`, `workers/shared/src/queue-registry.ts` ~L182). |
| Destinație (graf) | `e2-monitoring` | Nod agregat **familie monitoring** E2 în planificare; **nu** este o singură coadă executabilă; analog [`../../alerts/alert-bounce-high/alert-bounce-high-family.md`](../../alerts/alert-bounce-high/alert-bounce-high-family.md) — vezi neuroni E2 monitoring în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **sănătate outreach pipeline** sub agregatul **`e2-monitoring`** în graful de planificare. Comportamentul workerului și limitele de payload sunt în contractul neuron al sursei, nu în câmpurile exportului sinapsei.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:outreach:health`; `e2-monitoring` nu este nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e2:pipeline:outreach-health` (vezi `NEURON_MATRIX.csv` / contract neuron).
- **Planificare:** v2 §7 — `pipeline-outreach-health` → `e2-monitoring`.

## Limite și reconcilieri

- Slug graf `pipeline-outreach-health` vs coadă `pipeline:outreach:health`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-health-family\``.
