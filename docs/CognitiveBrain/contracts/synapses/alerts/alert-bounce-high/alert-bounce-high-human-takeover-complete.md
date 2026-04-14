# Sinapsă `alert-bounce-high-human-takeover-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-bounce-high-human-takeover-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-bounce-high/alert-bounce-high-human-takeover-complete.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-bounce-high` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-bounce-high` | [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md). **Runtime:** `alert:bounce:high` (`QUEUES.ALERT_BOUNCE_HIGH`, `queue-registry.ts` L168). |
| Țintă | `human-takeover-complete` | [`../../../neurons/E2/human--takeover--complete.md`](../../../neurons/E2/human--takeover--complete.md). **Runtime:** `human:takeover:complete` (`QUEUES.HUMAN_TAKEOVER_COMPLETE`, `queue-registry.ts` L174). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Finalizarea takeover-ului uman este ordonată în planificare după traseul alertei bounce ridicat. Exportul nu precizează lanțul job-urilor.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `alert:bounce:high` → `human:takeover:complete`.
- **Semantic (ADR-0002):** `e2:alert:bounce-high`; `e2:human:takeover-complete`.
- **Planificare:** v2 §7 — `alert-bounce-high` → `human-takeover-complete`.

## Limite și reconcilieri

- Slug graf vs coadă `human:takeover:complete`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-bounce-high-human-takeover-complete\``.
