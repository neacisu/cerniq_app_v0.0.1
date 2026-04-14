# Sinapsă `alert-internal-campaign-launched-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-campaign-launched-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-campaign-launched/alert-internal-campaign-launched-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-campaign-launched` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-campaign-launched` | Traseu în graf; [`../../../neurons/E5/alert--internal--campaign-launched.md`](../../../neurons/E5/alert--internal--campaign-launched.md). **Runtime:** coada v2 `alert:internal:campaign-launched` **nu** apare literal în `queue-registry.ts`; apropiere documentată: `alerts:campaign:trigger` (`QUEUES.E5_ALERT_CAMPAIGN_TRIGGER`, `queue-registry.ts` L631) — **nu** identitate 1:1. |
| Target | `e5-alerts` | Nod agregat **familie alerts** E5 în planificare; nu este o singură coadă; vezi `e5:alert:*` în catalog (ex. `e5:alert:campaign-trigger`). |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `alert-internal-campaign-launched` sub `e5-alerts` în graful de planificare. Execuția cozii granulare v2 nu este mapată 1:1 la un `QUEUES` dedicat cu același string la auditul documentat în contractul neuron.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap literal v2 vs `alerts:campaign:trigger` (L631); `e5-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** `e5:alert:campaign-trigger` și alți `e5:alert:*` — vezi catalog; contract neuron sursă.
- **Planificare:** v2 §7 — `alert-internal-campaign-launched` → `e5-alerts`.

## Limite și reconcilieri

- Nealiniere `alert:internal:campaign-launched` vs `alerts:campaign:trigger` — vezi contract neuron și ADR alerts.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-campaign-launched-family\``.
