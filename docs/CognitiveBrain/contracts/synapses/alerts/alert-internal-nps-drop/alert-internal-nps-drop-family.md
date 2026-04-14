# Sinapsă `alert-internal-nps-drop-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-nps-drop-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-nps-drop/alert-internal-nps-drop-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-nps-drop` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-nps-drop` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E5/alert--internal--nps-drop.md`](../../../neurons/E5/alert--internal--nps-drop.md). **Runtime:** v2 `alert:internal:nps-drop` — **fără** literal în `queue-registry.ts` la audit — vezi contract. |
| Destinație (graf) | `e5-alerts` | Agregat **familie alerts E5** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă — scădere NPS** sub **`e5-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-nps-drop-compliance-audit-generate.md`](alert-internal-nps-drop-compliance-audit-generate.md), [`alert-internal-nps-drop-compliance-consent-check.md`](alert-internal-nps-drop-compliance-consent-check.md), [`alert-internal-nps-drop-compliance-data-anonymize.md`](alert-internal-nps-drop-compliance-data-anonymize.md), [`alert-internal-nps-drop-compliance-optout-process.md`](alert-internal-nps-drop-compliance-optout-process.md).

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

- **Runtime (ADR-0001):** gap nominal pentru coada v2; `e5-alerts` agregat plan.
- **Semantic (ADR-0002):** `alert:internal:nps-drop` în Matrix / v2 (E5).
- **Planificare:** v2 §7 — `alert-internal-nps-drop` -> `e5-alerts`.

## Limite și reconcilieri

- NPS explicit vs agregări sentiment (`sentiment:aggregate`) este documentat în contractul sursă; sinapsa de familie nu îl rezolvă.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-nps-drop-family\``.
