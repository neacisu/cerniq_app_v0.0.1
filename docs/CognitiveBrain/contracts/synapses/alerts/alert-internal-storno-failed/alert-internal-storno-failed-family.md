# Sinapsă `alert-internal-storno-failed-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-storno-failed-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-storno-failed/alert-internal-storno-failed-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-storno-failed` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-storno-failed` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--storno-failed.md`](../../../neurons/E4/alert--internal--storno-failed.md). **Runtime:** v2 `alert:internal:storno-failed` — **0** potriviri literale în TS/JS; I39 `alert:payment` poate acoperi tematic eșecuri plată/storno **doar** dacă producătorii emit cu `alertType` potrivit — neverificat în contract — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă eșec storno** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-storno-failed-audit-compliance-check.md`](alert-internal-storno-failed-audit-compliance-check.md), [`alert-internal-storno-failed-audit-data-anonymize.md`](alert-internal-storno-failed-audit-data-anonymize.md), [`alert-internal-storno-failed-audit-log-write.md`](alert-internal-storno-failed-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap pentru `alert:internal:storno-failed`; agregat `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** v2_queue în contract; fără instanță catalog dedicată listată ca activă în contract.
- **Planificare:** v2 §7 — `alert-internal-storno-failed` → `e4-alerts`.

## Limite și reconcilieri

- Nu confunda infrastructura I39–I44 cu existența cozii granulare v2 fără dovezi în cod — vezi contract neuron.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-storno-failed-family\``.
