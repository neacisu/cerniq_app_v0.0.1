# Sinapsă `pipeline-monitor-rate-sync-pipeline-approval-pending`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-monitor-rate-sync-pipeline-approval-pending` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-monitor-rate-sync/pipeline-monitor-rate-sync-pipeline-approval-pending.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-monitor-rate-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pipeline-monitor-rate-sync` | [`../../../neurons/E1/pipeline--monitor--rate-sync.md`](../../../neurons/E1/pipeline--monitor--rate-sync.md). **Runtime:** `pipeline:monitor` (`QUEUES.PIPELINE_MONITOR`, ~L86); fără coadă dedicată `pipeline:monitor:rate-sync`. |
| Destinație (graf) | `pipeline-approval-pending` | [`../../../neurons/E1/pipeline--approval--pending.md`](../../../neurons/E1/pipeline--approval--pending.md). **Runtime:** fără coadă `pipeline:approval:pending` în registry; model alternativ în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graf, **rate-sync** (planificat ca traseu separat) depinde de **`pipeline-approval-pending`**. Exportul nu specifică dacă dependența este strictă ca ordine de execuție sau doar de model de date; nu completăm. Legătura operațională posibilă (ex. adâncime cozi vs task-uri approval) trebuie verificată în codul `p3-pipeline-monitor.ts` și în contractele neuron — nu în câmpurile sinapsei v2.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `pipeline:monitor` vs **absență** cozii `pipeline:approval:pending` în `QUEUES`.
- **Semantic (ADR-0002):** `e1:pipeline:monitor`; destinație fără aliniere catalog simplă pentru coada v2 (vezi neuron).
- **Planificare:** v2 §7 — `pipeline-monitor-rate-sync` → `pipeline-approval-pending`.

## Limite și reconcilieri

- Aceeași tensiune **graf două noduri monitor** / **o coadă** ca la `pipeline-monitor-health-pipeline-approval-pending.md`, plus semantică «rate-sync» distinctă doar în planificare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-monitor-rate-sync-pipeline-approval-pending\``.
