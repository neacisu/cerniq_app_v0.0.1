# Sinapsă `alert-bounce-high-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-bounce-high-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-bounce-high/alert-bounce-high-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-bounce-high` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-bounce-high` | Traseu în graf; [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md). **Runtime (ADR-0001):** `alert:bounce:high` (`QUEUES.ALERT_BOUNCE_HIGH`, `workers/shared/src/queue-registry.ts` L168). |
| Destinație (graf) | `e2-monitoring` | Nod agregat **familie monitoring** E2 în planificare; nu este o singură coadă executabilă; vezi neuroni E2 monitoring în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `alert-bounce-high` sub agregatul `e2-monitoring` în graful de planificare. Comportamentul worker-ului și limitele de payload sunt în contractul neuron al sursei, nu în câmpurile exportului sinapsei.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `alert:bounce:high`; `e2-monitoring` nu este nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e2:alert:bounce-high` (catalog — contract neuron).
- **Planificare:** v2 §7 — `alert-bounce-high` → `e2-monitoring`.

## Limite și reconcilieri

- Divergențe payload / `alertType` documentate în [`../../../neurons/E2/alert--bounce--high.md`](../../../neurons/E2/alert--bounce--high.md).
- Slug graf vs coadă `alert:bounce:high`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-bounce-high-family\``.
