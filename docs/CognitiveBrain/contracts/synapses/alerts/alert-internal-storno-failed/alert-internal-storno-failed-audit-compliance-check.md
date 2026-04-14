# Sinapsă `alert-internal-storno-failed-audit-compliance-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-storno-failed-audit-compliance-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-storno-failed/alert-internal-storno-failed-audit-compliance-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-storno-failed` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-internal-storno-failed` | **Contract:** [`../../../neurons/E4/alert--internal--storno-failed.md`](../../../neurons/E4/alert--internal--storno-failed.md). **Runtime:** v2 `alert:internal:storno-failed` fără literal în cod la audit — vezi contract. |
| Destinație (graf) | `audit-compliance-check` | **Contract:** [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). **Gap registry:** coada v2 `audit:compliance:check` absentă; apropiere J46 `audit:chain:verify` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta internă (eșec storno)** este legată canonic, în graf, de **verificarea conformității audit**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie trigger-ul sau regulile.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** sursă nedovedită ca job vs ținta cu gap / J46 — vezi contracte.
- **Semantic (ADR-0002):** alerts E4 vs audit.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia rămâne structurală în plan; lanțul alertă → audit nu este exportat de v2 pe această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-storno-failed-audit-compliance-check\``.
