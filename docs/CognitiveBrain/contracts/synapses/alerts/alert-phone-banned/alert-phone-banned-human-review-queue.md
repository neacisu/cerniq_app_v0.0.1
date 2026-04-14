# Sinapsă `alert-phone-banned-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-banned-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-banned/alert-phone-banned-human-review-queue.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-banned` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-banned` | **Contract:** [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). **Runtime:** `QUEUES.ALERT_PHONE_BANNED` → `alert:phone:banned` — vezi contract neuron. |
| Destinație (graf) | `human-review-queue` | **Contract:** [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). **Runtime:** `QUEUES.HUMAN_REVIEW_QUEUE` → `human:review:queue`; worker `createReviewQueueManagerWorker` în `workers/outreach/src/workers/hitl.ts` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta telefon banat** este legată canonic de **coada de review pentru operator** (înscriere `human_review_queue`, SLA). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie maparea evenimentului de ban la deschiderea unui review.

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

- **Runtime (ADR-0001):** ambele cozi în registry; legătura efectivă alertă → review necesită dovezi de `add` — în afara câmpurilor sinapsei.
- **Semantic (ADR-0002):** monitoring E2 vs human E2.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia este structurală; implementarea completă a lanțului nu este codificată în exportul v2 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-banned-human-review-queue\``.
