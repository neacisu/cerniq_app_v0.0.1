# Sinapsă `alert-client-account-blocked-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-client-account-blocked-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-client-account-blocked/alert-client-account-blocked-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-client-account-blocked` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-client-account-blocked` | Traseu în graf; [`../../../neurons/E4/alert--client--account-blocked.md`](../../../neurons/E4/alert--client--account-blocked.md) documentează **gap** pentru coada granulară `alert:client:account-blocked` în `queue-registry.ts` la auditul citit; infrastructură generică E4 `alert:*` în `i-alert-workers.ts`. |
| Țintă | `e4-alerts` | Nod agregat **familie alerts** E4 în planificare; nu este o singură coadă; vezi `e4:alert:*` în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `alert-client-account-blocked` sub `e4-alerts` în graful de planificare. Execuția cozii granulare v2 nu este mapată 1:1 la un `QUEUES` dedicat la auditul documentat în contractul neuron.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** **fără** `alert:client:account-blocked` în `queue-registry.ts` la auditul documentat; `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** gap catalog pentru coada granulară; cozi generice `e4:alert:payment` … `e4:alert:dispatch` — vezi contract neuron.
- **Planificare:** v2 §7 — `alert-client-account-blocked` → `e4-alerts`.

## Limite și reconcilieri

- Granular v2 vs cozi `alert:*` implementate — contract neuron.
- Swimlane / metrici: vezi reconcilierile din contractul neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-client-account-blocked-family\``.
