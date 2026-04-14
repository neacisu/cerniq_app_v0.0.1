# Sinapsă `campaign-cluster-launch-content-drip-schedule`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-content-drip-schedule` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-content-drip-schedule.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | **Contract:** [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime:** vezi gap / reconciliere în contract neuron sursă. |
| Destinație (graf) | `content-drip-schedule` | **Contract:** [`../../../neurons/E5/content--drip--schedule.md`](../../../neurons/E5/content--drip--schedule.md). **Runtime (ADR-0001):** `content:drip:schedule` (`QUEUES.E5_CONTENT_DRIP_SCHEDULE`). **Semantic (ADR-0002):** `e5:content:drip-schedule`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Lansarea clusterului de campanie** depinde în planificare de **planificarea drip-ului de conținut** (I48). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie datele sau ordinea job-urilor între sursă și planificator.

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

- **Runtime (ADR-0001):** ținta are coadă în registry; sursa poate fi neconectată — vezi contract neuron `campaign--cluster--launch`.
- **Semantic (ADR-0002):** E5 referral (sursă planificată) vs E5 content-drip (țintă).
- **Planificare:** dependență declarativă `campaign-cluster-launch` → `content-drip-schedule`.

## Limite și reconcilieri

- Execuția efectivă a lanțului depinde de existența workerilor și a enqueue-urilor — **nu** deduse din sinapsă.
- Muchia este structurală în v2; detalii operaționale în contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-content-drip-schedule\``.
