# Sinapsă `monitor-email-deliverability-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-email-deliverability-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-email-deliverability/monitor-email-deliverability-human-review-queue.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-email-deliverability` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-email-deliverability` | **Contract:** [`../../../neurons/E2/monitor--email--deliverability.md`](../../../neurons/E2/monitor--email--deliverability.md). **Triplă autoritate:** v2 `monitor:email:deliverability`; **runtime:** vezi contract neuron. |
| Destinație (graf) | `human-review-queue` | **Contract:** [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-email-deliverability** are dependență canonică de pipeline față de **human-review-queue** (coadă revizuire umană). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `monitor-email-deliverability` → `human-review-queue`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L84**; **Destinație (coadă):** `human:review:queue` la **L76**.
- **Runtime:** vezi neuronii.

## Limite și reconcilieri

- Detaliile operaționale ale cozii de review față de monitorul de deliverability nu sunt encodate în export; vezi contractele neuron și workers.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-email-deliverability-human-review-queue\``.
