# Sinapsă `human-queue-prioritize-report-daily-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-queue-prioritize-report-daily-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-queue-prioritize/human-queue-prioritize-report-daily-generate.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-queue-prioritize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `human-queue-prioritize` | **Contract:** [`../../../neurons/E3/human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md). **Runtime (ADR-0001):** v2 `human:queue:prioritize` — **gap** coadă în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `report-daily-generate` | **Contract:** [`../../../neurons/E3/report--daily--generate.md`](../../../neurons/E3/report--daily--generate.md). **Runtime:** v2 `report:daily:generate` — **gap** la auditul din contract — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **human-queue-prioritize** are dependență sintactică față de nodul **report-daily-generate**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** descrie cum generarea raportului zilnic ar depinde de prioritizarea cozii.

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

- **Planificare:** v2 §7 — `human-queue-prioritize` → `report-daily-generate`.
- **Runtime (ADR-0001):** ambele capete — **gap** la auditul din contractele neuron.
- **Semantic (ADR-0002):** ținta — **`ops`** E3; vezi [`report--daily--generate.md`](../../../neurons/E3/report--daily--generate.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe ambele capete — vezi contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-queue-prioritize-report-daily-generate\``.
