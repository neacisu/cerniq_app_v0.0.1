# Sinapsă `alert-internal-compliance-issue-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-compliance-issue-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-compliance-issue/alert-internal-compliance-issue-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-compliance-issue` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-compliance-issue` | Traseu în graf; [`../../../neurons/E4/alert--internal--compliance-issue.md`](../../../neurons/E4/alert--internal--compliance-issue.md). **Runtime:** coada v2 `alert:internal:compliance-issue` **nu** apare literal în `queue-registry.ts`; există infrastructură generică E4 `alert:payment` … `alert:dispatch` (I39–I44) — **fără** mapare explicită la acest nume; vezi contract neuron. |
| Target | `e4-alerts` | Nod agregat **familie alerts** E4 în planificare; nu este o singură coadă; vezi `e4:alert:*` în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `alert-internal-compliance-issue` sub `e4-alerts` în graful de planificare. Execuția cozii granulare v2 nu este mapată 1:1 la un `QUEUES` dedicat cu același string la auditul documentat.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap literal v2 vs cozi `alert:*` generice; `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** `e4:alert:payment` … `e4:alert:dispatch` — vezi catalog; contract neuron sursă.
- **Planificare:** v2 §7 — `alert-internal-compliance-issue` → `e4-alerts`.

## Limite și reconcilieri

- Granular v2 vs strat I39–I44 — contract neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-compliance-issue-family\``.
