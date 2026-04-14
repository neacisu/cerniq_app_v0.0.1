# Sinapsă `alert-internal-insolvency-detected-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-insolvency-detected-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-insolvency-detected/alert-internal-insolvency-detected-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-insolvency-detected` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-insolvency-detected` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--insolvency-detected.md`](../../../neurons/E4/alert--internal--insolvency-detected.md). **Runtime:** v2 `alert:internal:insolvency-detected` **fără** literal în TS/JS la audit; I39–I44 pe cozi agregate fără nume dedicat insolvență — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă — insolvență detectată** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-insolvency-detected-audit-compliance-check.md`](alert-internal-insolvency-detected-audit-compliance-check.md), [`alert-internal-insolvency-detected-audit-data-anonymize.md`](alert-internal-insolvency-detected-audit-data-anonymize.md), [`alert-internal-insolvency-detected-audit-log-write.md`](alert-internal-insolvency-detected-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap pentru coada granulară v2; fluxuri financiare/credit în alte cozi E4 — vezi contract sursă.
- **Semantic (ADR-0002):** `alert:internal:insolvency-detected` în Matrix / v2.
- **Planificare:** v2 §7 — `alert-internal-insolvency-detected` -> `e4-alerts`.

## Limite și reconcilieri

- Producătorul job-ului pentru această etichetă graf nu este dovedit de sinapsă; reconciliere în cod.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-insolvency-detected-family\``.
