# Sinapsă `churn-recovery-check-referral-request-prepare`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-recovery-check-referral-request-prepare` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-recovery-check/churn-recovery-check-referral-request-prepare.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-recovery-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-recovery-check` | Contract: [`../../../neurons/E5/churn--recovery--check.md`](../../../neurons/E5/churn--recovery--check.md). |
| Destinație (graf) | `referral-request-prepare` | Contract: [`../../../neurons/E5/referral--request--prepare.md`](../../../neurons/E5/referral--request--prepare.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** conectează **churn-recovery-check** de **referral-request-prepare** în planificare.

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

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-recovery-check-referral-request-prepare\``.
