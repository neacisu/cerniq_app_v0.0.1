# Sinapsă `alert-phone-offline-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-offline-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-offline/alert-phone-offline-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-offline` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-phone-offline` | Traseu în graf; [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Runtime (ADR-0001):** `alert:phone:offline` (`QUEUES.ALERT_PHONE_OFFLINE`, `workers/shared/src/queue-registry.ts`). **Semantic (ADR-0002):** `e2:alert:phone-offline` — vezi contract neuron. |
| Destinație (graf) | `e2-monitoring` | Nod agregat **familie monitoring** E2 în planificare; nu este o singură coadă executabilă; vezi catalog / ADR familie monitoring. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **alertă telefon offline** sub agregatul **`e2-monitoring`** în graful de planificare. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; comportamentul workerilor și payload-ul operațional sunt în contractul neuron, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`alert-phone-offline-human-approve-message.md`](alert-phone-offline-human-approve-message.md), [`alert-phone-offline-human-review-queue.md`](alert-phone-offline-human-review-queue.md), [`alert-phone-offline-human-takeover-initiate.md`](alert-phone-offline-human-takeover-initiate.md), [`alert-phone-offline-human-takeover-complete.md`](alert-phone-offline-human-takeover-complete.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `alert:phone:offline`; `e2-monitoring` nu este nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e2:alert:phone-offline` (catalog — contract neuron); familie v2 neuron: `monitoring`.
- **Planificare:** v2 §7 — `alert-phone-offline` → `e2-monitoring`.

## Limite și reconcilieri

- Calea contractului sub `synapses/alerts/` reflectă organizarea documentelor, nu înlocuiește etapa **E2** și familia **monitoring** din contractul neuron.
- Persistență `webhook_event_archive`, notificări multi-canal — vezi [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md).
- Nu inventa payload / retry / safety / telemetrie dincolo de v2 pe muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-offline-family\``.
