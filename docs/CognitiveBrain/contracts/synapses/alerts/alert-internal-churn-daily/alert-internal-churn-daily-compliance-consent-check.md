# Sinapsă `alert-internal-churn-daily-compliance-consent-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-churn-daily-compliance-consent-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-churn-daily/alert-internal-churn-daily-compliance-consent-check.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-churn-daily` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `alert-internal-churn-daily` | [`../../../neurons/E5/alert--internal--churn-daily.md`](../../../neurons/E5/alert--internal--churn-daily.md). **Runtime:** **gap** literal în registry — vezi contract neuron. |
| Target | `compliance-consent-check` | [`../../../neurons/E5/compliance--consent--check.md`](../../../neurons/E5/compliance--consent--check.md). **Runtime:** mapare documentată către **`compliance:gdpr:check`** (`QUEUES.E5_COMPLIANCE_GDPR_CHECK`, L634) — **nu** același string ca v2 `compliance:consent:check`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Verificarea legată de consent în planificare este dependentă de traseul alertei churn zilnice. Ordinea și datele job-urilor nu sunt în export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; destinație nominală v2 vs `compliance:gdpr:check` (K56).
- **Semantic (ADR-0002):** `e5:compliance:gdpr-check` — vezi catalog.
- **Planificare:** v2 §7 — `alert-internal-churn-daily` → `compliance-consent-check`.

## Limite și reconcilieri

- Nume v2 vs coadă GDPR — contract neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-churn-daily-compliance-consent-check\``.
