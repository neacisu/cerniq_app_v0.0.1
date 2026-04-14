# Sinapsă `human-queue-prioritize-pipeline-ai-sales-metrics`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-queue-prioritize-pipeline-ai-sales-metrics` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-queue-prioritize/human-queue-prioritize-pipeline-ai-sales-metrics.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-queue-prioritize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `human-queue-prioritize` | **Contract:** [`../../../neurons/E3/human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md). **Runtime (ADR-0001):** v2 `human:queue:prioritize` — **gap** coadă în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `pipeline-ai-sales-metrics` | **Contract:** [`../../../neurons/E3/pipeline--ai-sales--metrics.md`](../../../neurons/E3/pipeline--ai-sales--metrics.md). **Runtime:** v2 `pipeline:ai-sales:metrics` — **gap** la auditul din contract — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **human-queue-prioritize** are dependență sintactică față de nodul **pipeline-ai-sales-metrics**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** descrie cum metricile pipeline ar depinde de prioritizarea cozii HITL.

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

- **Planificare:** v2 §7 — `human-queue-prioritize` → `pipeline-ai-sales-metrics`.
- **Runtime (ADR-0001):** ambele capete — **gap** la auditul din contractele neuron.
- **Semantic (ADR-0002):** ținta — **`ops`** E3; vezi [`pipeline--ai-sales--metrics.md`](../../../neurons/E3/pipeline--ai-sales--metrics.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe ambele capete — vezi contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-queue-prioritize-pipeline-ai-sales-metrics\``.
