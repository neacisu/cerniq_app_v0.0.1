# Sinapsă `churn-behavior-detect-referral-eligibility-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-behavior-detect-referral-eligibility-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-behavior-detect/churn-behavior-detect-referral-eligibility-check.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-behavior-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-behavior-detect` | Contract: [`../../../neurons/E5/churn--behavior--detect.md`](../../../neurons/E5/churn--behavior--detect.md). |
| Destinație (graf) | `referral-eligibility-check` | Contract: [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** conectează detectarea comportamentului churn de **referral-eligibility-check** în graful planificat.

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Vezi contracte. |
| **Semantic (ADR-0002)** | E5. |
| **Planificare** | v2 §7. |

## Limite și reconcilieri

- **Export-grounded.**

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-behavior-detect-referral-eligibility-check\``.
