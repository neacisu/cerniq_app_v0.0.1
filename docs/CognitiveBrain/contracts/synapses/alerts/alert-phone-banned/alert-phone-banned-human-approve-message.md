# Sinapsă `alert-phone-banned-human-approve-message`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-phone-banned-human-approve-message` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-phone-banned/alert-phone-banned-human-approve-message.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-phone-banned` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-phone-banned` | **Contract:** [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). **Runtime:** `QUEUES.ALERT_PHONE_BANNED` → `alert:phone:banned` — vezi contract neuron. |
| Destinație (graf) | `human-approve-message` | **Contract:** [`../../../neurons/E2/human--approve--message.md`](../../../neurons/E2/human--approve--message.md). **Runtime:** `QUEUES.HUMAN_APPROVE_MESSAGE` → `human:approve:message` în registry; **gap procesor** în `workers/outreach` la data auditului din contract — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta telefon banat** este legată canonic, în graf, de **fluxul HITL de aprobare mesaj**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie condițiile de rutare sau payload-ul între cele două noduri.

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

- **Runtime (ADR-0001):** ambele cozi există în registry; traseul alertă → approve rămâne de reconciliat cu `add`/worker-i reali — vezi contracte.
- **Semantic (ADR-0002):** monitoring E2 vs human E2.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- `human:approve` (E3) este **alt** contract decât `human:approve:message` — vezi contract neuron approve-message.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-phone-banned-human-approve-message\``.
