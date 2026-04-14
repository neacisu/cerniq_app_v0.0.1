# Sinapsă `alert-internal-oblio-sync-failed-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-oblio-sync-failed-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-oblio-sync-failed/alert-internal-oblio-sync-failed-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-oblio-sync-failed` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-oblio-sync-failed` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--oblio-sync-failed.md`](../../../neurons/E4/alert--internal--oblio-sync-failed.md). **Runtime:** v2 `alert:internal:oblio-sync-failed` — **0** potriviri literale în TS/JS la auditul din contract; fără mapare documentată Oblio → această coadă — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă eșec sincronizare Oblio** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-oblio-sync-failed-audit-compliance-check.md`](alert-internal-oblio-sync-failed-audit-compliance-check.md), [`alert-internal-oblio-sync-failed-audit-data-anonymize.md`](alert-internal-oblio-sync-failed-audit-data-anonymize.md), [`alert-internal-oblio-sync-failed-audit-log-write.md`](alert-internal-oblio-sync-failed-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap pentru `alert:internal:oblio-sync-failed` vs cozi Oblio/stoc existente; agregat `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** v2_queue în Matrix / contract neuron; fără `nodeKey` catalog listat în contract ca instanță activă.
- **Planificare:** v2 §7 — `alert-internal-oblio-sync-failed` → `e4-alerts`.

## Limite și reconcilieri

- Flux `stock:sync:oblio` și alertele I43/I44 **nu** echivalează automat această alertă granulară fără dovezi suplimentare — vezi contract neuron.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-oblio-sync-failed-family\``.
