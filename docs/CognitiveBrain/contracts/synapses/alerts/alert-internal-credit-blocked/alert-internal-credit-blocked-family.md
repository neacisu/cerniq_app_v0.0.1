# Sinapsă `alert-internal-credit-blocked-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-credit-blocked-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-credit-blocked/alert-internal-credit-blocked-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-credit-blocked` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-credit-blocked` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--credit-blocked.md`](../../../neurons/E4/alert--internal--credit-blocked.md). **Runtime:** v2 `alert:internal:credit-blocked` **fără** intrare literală în `queue-registry.ts` la audit; există `E4_ALERT_CREDIT` -> `alert:credit` (I41) — **nu** echivalență nominală cu coada granulară v2. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă — credit blocat** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-credit-blocked-audit-compliance-check.md`](alert-internal-credit-blocked-audit-compliance-check.md), [`alert-internal-credit-blocked-audit-data-anonymize.md`](alert-internal-credit-blocked-audit-data-anonymize.md), [`alert-internal-credit-blocked-audit-log-write.md`](alert-internal-credit-blocked-audit-log-write.md).

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

- **Runtime (ADR-0001):** sursă — gap nominal; `alert:credit` pentru tematică apropiată — vezi contract sursă.
- **Semantic (ADR-0002):** `alert:internal:credit-blocked` în Matrix / v2; `e4-alerts` agregat plan.
- **Planificare:** v2 §7 — `alert-internal-credit-blocked` -> `e4-alerts`.

## Limite și reconcilieri

- Slug graf `alert-internal-credit-blocked` vs cozi `alert:*` din registry; reconciliere obligatorie înainte de mapare 1:1 job.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-credit-blocked-family\``.
