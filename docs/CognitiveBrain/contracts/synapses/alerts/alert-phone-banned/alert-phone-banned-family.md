# Sinapsă `alert-phone-banned-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-banned-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-banned/alert-phone-banned-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-banned` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-phone-banned` | Traseu în graf; [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). **Runtime (ADR-0001):** `alert:phone:banned` (`QUEUES.ALERT_PHONE_BANNED`, `workers/shared/src/queue-registry.ts`). **Semantic (ADR-0002):** `e2:alert:phone-banned` — vezi contract neuron. |
| Destinație (graf) | `e2-monitoring` | Nod agregat **familie monitoring** E2 în planificare; nu este o singură coadă executabilă; vezi catalog / ADR familie monitoring. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **alertă telefon banat** sub agregatul **`e2-monitoring`** în graful de planificare. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; comportamentul workerilor și payload-ul sunt în contractul neuron, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`alert-phone-banned-human-approve-message.md`](alert-phone-banned-human-approve-message.md), [`alert-phone-banned-human-review-queue.md`](alert-phone-banned-human-review-queue.md), [`alert-phone-banned-human-takeover-initiate.md`](alert-phone-banned-human-takeover-initiate.md), [`alert-phone-banned-human-takeover-complete.md`](alert-phone-banned-human-takeover-complete.md).

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

- **Runtime (ADR-0001):** `alert:phone:banned`; `e2-monitoring` nu este nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e2:alert:phone-banned` (catalog — contract neuron); familie v2 neuron: `monitoring`.
- **Planificare:** v2 §7 — `alert-phone-banned` → `e2-monitoring`.

## Limite și reconcilieri

- Calea contractului sub `synapses/alerts/` reflectă organizarea documentelor, nu înlocuiește etapa **E2** și familia **monitoring** din contractul neuron.
- Payload `PhoneBannedAlertJobData`, ramuri quarantine vs `extra-dispatch` — vezi [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md).
- Nu inventa payload / retry / safety / telemetrie dincolo de v2 pe muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-banned-family\``.
