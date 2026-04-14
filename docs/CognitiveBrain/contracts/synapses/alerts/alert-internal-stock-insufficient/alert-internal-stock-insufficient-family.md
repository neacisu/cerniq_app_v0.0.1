# Sinapsă `alert-internal-stock-insufficient-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-stock-insufficient-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-stock-insufficient/alert-internal-stock-insufficient-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-stock-insufficient` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-stock-insufficient` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--stock-insufficient.md`](../../../neurons/E4/alert--internal--stock-insufficient.md). **Runtime:** v2 `alert:internal:stock-insufficient` — **0** potriviri literale în TS/JS; I43 `alert:stock` este tematic apropiat dar **alt** identificator — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă stoc insuficient** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-stock-insufficient-audit-compliance-check.md`](alert-internal-stock-insufficient-audit-compliance-check.md), [`alert-internal-stock-insufficient-audit-data-anonymize.md`](alert-internal-stock-insufficient-audit-data-anonymize.md), [`alert-internal-stock-insufficient-audit-log-write.md`](alert-internal-stock-insufficient-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap pentru `alert:internal:stock-insufficient` vs `alert:stock`; agregat `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** `e4:alert:stock` în catalog pentru I43 — **nu** este același `v2_queue` ca în contractul alertei granulare.
- **Planificare:** v2 §7 — `alert-internal-stock-insufficient` → `e4-alerts`.

## Limite și reconcilieri

- Alinierea semantică „insufficient” vs „low stock” depinde de `alertType` în payload pe I43 — vezi contract neuron; nu se echivalează numele cozilor fără dovadă.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-stock-insufficient-family\``.
