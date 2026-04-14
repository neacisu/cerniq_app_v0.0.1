# Sinapsă `alert-phone-offline-human-takeover-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-offline-human-takeover-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-offline/alert-phone-offline-human-takeover-complete.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-offline` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-offline` | **Contract:** [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Runtime:** `QUEUES.ALERT_PHONE_OFFLINE` → `alert:phone:offline` — vezi contract neuron. |
| Destinație (graf) | `human-takeover-complete` | **Contract:** [`../../../neurons/E2/human--takeover--complete.md`](../../../neurons/E2/human--takeover--complete.md). **Runtime:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graful de planificare, **alerta telefon offline** depinde de **închidere takeover uman**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie criteriile de completare sau stările finale.

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

- **Runtime (ADR-0001):** vezi registry și contractele neuron; sinapsa nu adaugă mapare executabilă.
- **Semantic (ADR-0002):** E2 monitoring vs human pipeline.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- La fel ca pentru celelalte muchii HITL din acest traseu: neuronul alertă poate nu enfileza direct cozi `human:*` — vezi [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md).
- Muchia este structurală; implementarea completă nu este în exportul v2 pentru această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-offline-human-takeover-complete\``.
