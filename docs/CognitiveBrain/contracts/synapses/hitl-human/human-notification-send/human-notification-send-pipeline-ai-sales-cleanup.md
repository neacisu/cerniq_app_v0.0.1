# Sinapsă `human-notification-send-pipeline-ai-sales-cleanup`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-notification-send-pipeline-ai-sales-cleanup` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-notification-send/human-notification-send-pipeline-ai-sales-cleanup.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-notification-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `human-notification-send` | **Contract:** [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md). **Runtime (ADR-0001):** v2 `human:notification:send` — **gap** coadă în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `pipeline-ai-sales-cleanup` | **Contract:** [`../../../neurons/E3/pipeline--ai-sales--cleanup.md`](../../../neurons/E3/pipeline--ai-sales--cleanup.md). **Runtime:** v2 `pipeline:ai-sales:cleanup` — **gap** la auditul din contract — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **human-notification-send** are dependență sintactică față de nodul **pipeline-ai-sales-cleanup**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** descrie trigger-e sau payload între notificare și curățarea pipeline-ului.

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

- **Planificare:** v2 §7 — `human-notification-send` → `pipeline-ai-sales-cleanup`.
- **Runtime (ADR-0001):** ambele capete — **gap** la auditul din contractele neuron.
- **Semantic (ADR-0002):** ținta — **`ops`** E3; vezi [`pipeline--ai-sales--cleanup.md`](../../../neurons/E3/pipeline--ai-sales--cleanup.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe ambele capete — vezi contractele neuron; specificațiile din `etapa3-workers-overview.md` sunt **ținte documentate**, nu înlocuiesc lipsa handlerului din auditul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-notification-send-pipeline-ai-sales-cleanup\``.
