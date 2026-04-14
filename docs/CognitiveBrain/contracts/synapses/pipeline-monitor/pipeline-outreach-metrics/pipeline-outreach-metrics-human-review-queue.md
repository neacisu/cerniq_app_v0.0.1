# Sinapsă `pipeline-outreach-metrics-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-metrics-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-metrics/pipeline-outreach-metrics-human-review-queue.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pipeline-outreach-metrics` | **Contract:** [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). **Triplă autoritate:** v2 **`pipeline:outreach:metrics`**; runtime **`e2:pipeline:outreach-metrics`**. |
| Destinație (graf) | `human-review-queue` | **Contract:** [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). **Triplă autoritate:** v2 **`human:review:queue`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **76**; `nodeKey` **`e2:human:review-queue`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **pipeline-outreach-metrics** depinde canonic de **human-review-queue** (coadă de revizuire umană). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `pipeline-outreach-metrics` → `human-review-queue`.
- **Semantic:** sursă și destinație **E2** în matrice.
- **Runtime:** vezi contractele neuron; ordinea efectivă a joburilor cere dovezi suplimentare din cod.

## Limite și reconcilieri

- Reconciliere slug graf ↔ `v2_queue`: `human-review-queue` ↔ **`human:review:queue`** — vezi matrice și neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-metrics-human-review-queue\``.
