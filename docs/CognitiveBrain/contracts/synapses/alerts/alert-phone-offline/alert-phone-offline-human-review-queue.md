# Sinapsă `alert-phone-offline-human-review-queue`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-offline-human-review-queue` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-offline/alert-phone-offline-human-review-queue.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-offline` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-offline` | **Contract:** [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Runtime:** `QUEUES.ALERT_PHONE_OFFLINE` → `alert:phone:offline` — vezi contract neuron. |
| Destinație (graf) | `human-review-queue` | **Contract:** [`../../../neurons/E2/human--review--queue.md`](../../../neurons/E2/human--review--queue.md). **Runtime:** `QUEUES.HUMAN_REVIEW_QUEUE` → `human:review:queue` — vezi contract neuron și `workers/outreach/src/workers/hitl.ts` dacă e citat acolo. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta telefon offline** este legată canonic de **coada de review pentru operator** în graful de planificare. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie maparea evenimentului offline la deschiderea unui review.

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

- **Runtime (ADR-0001):** ambele capete au corespondent sau notă în registry / contracte neuron; legătura efectivă alertă → review nu este descrisă de câmpurile sinapsei.
- **Semantic (ADR-0002):** monitoring E2 vs human E2.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Contractul neuron `alert--phone--offline` indică lipsa unei cozi `human:*` directe din procesorul alertei; muchia v2 rămâne **export-grounded** ca dependență de planificare.
- Muchia este structurală; lanțul complet nu este codificat în exportul v2 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-offline-human-review-queue\``.
