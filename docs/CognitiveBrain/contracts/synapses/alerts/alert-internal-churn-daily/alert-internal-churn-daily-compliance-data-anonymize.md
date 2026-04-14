# Sinapsă `alert-internal-churn-daily-compliance-data-anonymize`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-churn-daily-compliance-data-anonymize` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-churn-daily/alert-internal-churn-daily-compliance-data-anonymize.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-churn-daily` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-churn-daily` | [`../../../neurons/E5/alert--internal--churn-daily.md`](../../../neurons/E5/alert--internal--churn-daily.md). **Runtime:** **gap** literal în registry — vezi contract neuron. |
| Target | `compliance-data-anonymize` | [`../../../neurons/E4/compliance--data--anonymize.md`](../../../neurons/E4/compliance--data--anonymize.md). **Runtime:** **`audit:data:anonymize`** (`QUEUES.E4_AUDIT_DATA_ANONYMIZE`, L485); etichetă v2 `compliance:data:anonymize` — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Anonimizarea (nod `compliance-data-anonymize` în graf) este dependentă de traseul alertei churn zilnice. Exportul nu detaliază conținutul job-ului.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; destinație — `audit:data:anonymize`.
- **Semantic (ADR-0002):** `e4:audit:data-anonymize` — catalog.
- **Planificare:** v2 §7 — `alert-internal-churn-daily` → `compliance-data-anonymize`.

## Limite și reconcilieri

- Graf `compliance-data-anonymize` vs coadă `audit:data:anonymize` — contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-churn-daily-compliance-data-anonymize\``.
