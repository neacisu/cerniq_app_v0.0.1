# Sinapsă `churn-alert-escalate-referral-reward-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-referral-reward-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-referral-reward-process.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | Contract: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). |
| Destinație (graf) | `referral-reward-process` | Contract: [`../../../neurons/E5/referral--reward--process.md`](../../../neurons/E5/referral--reward--process.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă escaladarea churn de **procesarea recompensei referral** în planificare. Regulile de reward **nu** fac parte din câmpurile sinapsei din v2 §7.

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
| **Runtime (ADR-0001)** | Vezi contracte neuron. |
| **Semantic (ADR-0002)** | E5. |
| **Planificare** | v2 §7. |

## Limite și reconcilieri

- **Export-grounded.**

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-referral-reward-process\``.
