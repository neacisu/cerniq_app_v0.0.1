# Sinapsă `alert-internal-credit-blocked-audit-compliance-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-credit-blocked-audit-compliance-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-credit-blocked/alert-internal-credit-blocked-audit-compliance-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-credit-blocked` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `alert-internal-credit-blocked` | **Contract:** [`../../../neurons/E4/alert--internal--credit-blocked.md`](../../../neurons/E4/alert--internal--credit-blocked.md). **Runtime:** v2 `alert:internal:credit-blocked` fără literal în registry la audit; `alert:credit` (I41) nu înlocuiește nominal acest identificator — vezi contract. |
| Destinație (graf) | `audit-compliance-check` | **Contract:** [`../../../neurons/E4/audit--compliance--check.md`](../../../neurons/E4/audit--compliance--check.md). **Gap registry:** coada v2 `audit:compliance:check` absentă din registry; apropiere semantică J46 `audit:chain:verify` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Alerta internă credit blocat** este legată canonic, în graf, de **verificarea conformității audit**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum evenimentul de alertă declanșează verificarea sau ce reguli se aplică.

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

- **Runtime (ADR-0001):** sursă cu gap nominal vs destinație cu gap / mapare J46 — vezi contracte.
- **Semantic (ADR-0002):** familie `alerts` (E4) vs familie `audit` (E4) — etape distincte în catalog.
- **Planificare:** dependență declarativă alerts -> audit în export.

## Limite și reconcilieri

- Muchia este **structurală**; nu atestă un lanț de job-uri implementat end-to-end fără dovezi suplimentare în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-credit-blocked-audit-compliance-check\``.
