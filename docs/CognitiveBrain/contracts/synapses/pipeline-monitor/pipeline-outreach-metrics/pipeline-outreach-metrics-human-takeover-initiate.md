# Sinapsă `pipeline-outreach-metrics-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-metrics-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-metrics/pipeline-outreach-metrics-human-takeover-initiate.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pipeline-outreach-metrics` | **Contract:** [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). **Triplă autoritate:** v2 **`pipeline:outreach:metrics`**; runtime **`e2:pipeline:outreach-metrics`**. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Triplă autoritate:** v2 **`human:takeover:initiate`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **78**; `nodeKey` **`e2:human:takeover-initiate`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **pipeline-outreach-metrics** depinde canonic de **human-takeover-initiate** (pornire takeover uman). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `pipeline-outreach-metrics` → `human-takeover-initiate`.
- **Semantic:** ambele capete **E2**.
- **Runtime:** vezi contractele neuron.

## Limite și reconcilieri

- Slug `human-takeover-initiate` ↔ **`human:takeover:initiate`** — vezi matrice rând **78**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-metrics-human-takeover-initiate\``.
