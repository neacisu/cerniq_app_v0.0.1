# Sinapsă `alert-internal-competitor-price-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-competitor-price-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-competitor-price/alert-internal-competitor-price-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-competitor-price` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-competitor-price` | Traseu în graf; [`../../../neurons/E5/alert--internal--competitor-price.md`](../../../neurons/E5/alert--internal--competitor-price.md). **Runtime:** coada v2 `alert:internal:competitor-price` **nu** apare literal în `queue-registry.ts` la auditul documentat — vezi contract neuron. |
| Target | `e5-alerts` | Nod agregat **familie alerts** E5 în planificare; nu este o singură coadă; vezi `e5:alert:*` în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `alert-internal-competitor-price` sub `e5-alerts` în graful de planificare. Execuția cozii granulare v2 nu este mapată la un `QUEUES` cu același nume la auditul documentat.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap literal; `e5-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** fără intrare catalog pentru coada granulară v2; vezi contract neuron.
- **Planificare:** v2 §7 — `alert-internal-competitor-price` → `e5-alerts`.

## Limite și reconcilieri

- Pricing competitor în alte etape/cozi — în afara scope-ului acestei sinapse; vezi contract neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-competitor-price-family\``.
