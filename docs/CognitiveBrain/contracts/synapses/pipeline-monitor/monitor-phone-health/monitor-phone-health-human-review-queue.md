# Sinapsă `monitor-phone-health-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-phone-health-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-phone-health/monitor-phone-health-human-review-queue.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-phone-health` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-phone-health` | **Contract:** [`../../../neurons/E2/monitor--phone--health.md`](../../../neurons/E2/monitor--phone--health.md). **Triplă autoritate:** v2 `monitor:phone:health`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-review-queue` | **Contract:** [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-phone-health** are dependență canonică de pipeline față de **human-review-queue**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-phone-health` → `human-review-queue`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L85**; țintă `human:review:queue` la **L76**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Legătura cauzală detaliată între monitorul de telefon și coada de review este doar topologică în v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-phone-health-human-review-queue\``.
