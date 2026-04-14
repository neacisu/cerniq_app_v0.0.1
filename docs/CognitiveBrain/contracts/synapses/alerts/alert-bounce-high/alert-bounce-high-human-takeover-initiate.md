# Sinapsă `alert-bounce-high-human-takeover-initiate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-bounce-high-human-takeover-initiate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-bounce-high/alert-bounce-high-human-takeover-initiate.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-bounce-high` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-bounce-high` | [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md). **Runtime:** `alert:bounce:high` (`QUEUES.ALERT_BOUNCE_HIGH`, `queue-registry.ts` L168). |
| Țintă | `human-takeover-initiate` | [`../../../neurons/E2/human--takeover--initiate.md`](../../../neurons/E2/human--takeover--initiate.md). **Runtime:** `human:takeover:initiate` (`QUEUES.HUMAN_TAKEOVER_INITIATE`, `queue-registry.ts` L173). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Inițierea takeover-ului uman depinde în graf de alerta bounce ridicat. Fără mecanism detaliat din v2 §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `alert:bounce:high` → `human:takeover:initiate`.
- **Semantic (ADR-0002):** `e2:alert:bounce-high`; `e2:human:takeover-initiate`.
- **Planificare:** v2 §7 — `alert-bounce-high` → `human-takeover-initiate`.

## Limite și reconcilieri

- Slug graf vs coadă `human:takeover:initiate`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-bounce-high-human-takeover-initiate\``.
