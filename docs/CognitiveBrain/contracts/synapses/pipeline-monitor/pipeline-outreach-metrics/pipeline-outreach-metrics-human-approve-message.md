# Sinapsă `pipeline-outreach-metrics-human-approve-message`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-metrics-human-approve-message` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-metrics/pipeline-outreach-metrics-human-approve-message.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pipeline-outreach-metrics` | **Contract:** [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). **Triplă autoritate:** v2 **`pipeline:outreach:metrics`**; runtime **`e2:pipeline:outreach-metrics`**. |
| Destinație (graf) | `human-approve-message` | **Contract:** [`../../../neurons/E2/human--approve--message.md`](../../../neurons/E2/human--approve--message.md). **Triplă autoritate:** v2 **`human:approve:message`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **75**; `nodeKey` **`e2:human:approve-message`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **pipeline-outreach-metrics** are dependență canonică de pipeline față de **human-approve-message** (HITL / aprobare mesaj). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload sau politici de execuție între noduri.

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

- **Planificare:** v2 §7 — `pipeline-outreach-metrics` → `human-approve-message`.
- **Semantic:** ambele capete **E2** în matrice; ținta este familie **`human`** (swimlane — vezi catalog / neuron).
- **Runtime:** vezi contractele neuron; nu inferăm ordinea joburilor BullMQ din singurul export.

## Limite și reconcilieri

- Slug-urile din graf folosesc cratimă (`human-approve-message`); registry / v2 folosesc adesea două puncte (`human:approve:message`) — echivalența este prin **NEURON_MATRIX** și contracte neuron, nu prin identitate lexicală brută.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-metrics-human-approve-message\``.
