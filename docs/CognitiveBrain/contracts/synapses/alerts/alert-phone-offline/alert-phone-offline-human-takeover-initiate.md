# Sinapsă `alert-phone-offline-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-offline-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-offline/alert-phone-offline-human-takeover-initiate.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-offline` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-offline` | **Contract:** [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Runtime:** `QUEUES.ALERT_PHONE_OFFLINE` → `alert:phone:offline` — vezi contract neuron. |
| Destinație (graf) | `human-takeover-initiate` | **Contract:** [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Runtime:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful de planificare, **alerta telefon offline** depinde de capacitatea de **inițiere takeover uman**. v2: **„sinapsă canonică de pipeline”**; exportul nu specifică trigger-ul operațional sau payload-ul.

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

- **Runtime (ADR-0001):** vezi cozi în contractele neuron sursă/țintă; sinapsa v2 nu le leagă prin câmpuri suplimentare.
- **Semantic (ADR-0002):** E2 monitoring vs human pipeline.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Posibilă tensiune între auditul neuronului alertă (fără `human:*` direct din handler) și muchiile HITL din export — documentată ca **reconciliere graf ↔ implementare**, fără presupuneri despre wiring.
- Muchia este structurală; detalii de execuție nu sunt în exportul v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-offline-human-takeover-initiate\``.
