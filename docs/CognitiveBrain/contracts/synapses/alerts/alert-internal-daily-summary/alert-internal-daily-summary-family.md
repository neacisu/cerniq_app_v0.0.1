# Sinapsă `alert-internal-daily-summary-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-daily-summary-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-daily-summary/alert-internal-daily-summary-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-daily-summary` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-daily-summary` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--daily-summary.md`](../../../neurons/E4/alert--internal--daily-summary.md). **Runtime:** v2 `alert:internal:daily-summary` — **0** potriviri literale în TS/JS la audit; fără coadă dedicată în registry — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **rezumat zilnic intern** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-daily-summary-audit-compliance-check.md`](alert-internal-daily-summary-audit-compliance-check.md), [`alert-internal-daily-summary-audit-data-anonymize.md`](alert-internal-daily-summary-audit-data-anonymize.md), [`alert-internal-daily-summary-audit-log-write.md`](alert-internal-daily-summary-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap runtime pentru sursă; agregat `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** `alert:internal:daily-summary` în Matrix / v2.
- **Planificare:** v2 §7 — `alert-internal-daily-summary` -> `e4-alerts`.

## Limite și reconcilieri

- Slug graf vs orice coadă I39–I44 trebuie reconciliat în cod; sinapsa nu fixează producătorul.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-daily-summary-family\``.
