# Sinapsă `alert-phone-offline-human-approve-message`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-offline-human-approve-message` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-offline/alert-phone-offline-human-approve-message.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-offline` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-offline` | **Contract:** [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Runtime:** `QUEUES.ALERT_PHONE_OFFLINE` → `alert:phone:offline` — vezi contract neuron. |
| Destinație (graf) | `human-approve-message` | **Contract:** [`../../../neurons/E2/human--approve--message.md`](../../../neurons/E2/human--approve--message.md). **Runtime:** vezi contract neuron pentru coadă și worker HITL. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta telefon offline** este legată în graf de nodul **aprobare mesaj uman** (pipeline canonic HITL). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum evenimentul offline declanșează sau populează fluxul de aprobare.

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

- **Runtime (ADR-0001):** coadă alertă confirmată în registry; legătura efectivă alertă → HITL nu este codificată în câmpurile sinapsei v2.
- **Semantic (ADR-0002):** monitoring E2 vs human E2 — vezi contractele neuron.
- **Planificare:** dependență declarativă în export.

## Limite și reconcilieri

- Contractul neuron `alert--phone--offline` notează **fără** coadă `human:*` directă din handler-ul auditat; muchia din v2 exprimă **poziția în graful de planificare**. Traseul operațional complet între alertă și aprobare necesită reconciliere graf ↔ cod.
- Muchia este structurală; implementarea detaliată nu este în exportul v2 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-offline-human-approve-message\``.
