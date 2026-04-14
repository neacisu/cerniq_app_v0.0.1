# Sinapsă `churn-alert-escalate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-alert-escalate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-alert-escalate/churn-alert-escalate-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-alert-escalate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-alert-escalate` | **Graf:** escaladare alertă churn. Contract neuron: [`../../../neurons/E5/churn--alert--escalate.md`](../../../neurons/E5/churn--alert--escalate.md). **v2_queue (graf):** `churn:alert:escalate`; **runtime** documentat în neuron ca `churn:risk:escalate` — reconciliere explicită acolo. |
| Destinație (graf) | `e5-churn` | Agregat familie **churn** E5. v2: [`### ADR-FAMILY-e5-churn`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e5/churn.md`](../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **churn-alert-escalate** de agregatul **`e5-churn`**. v2: **„specializează familia”** — în planificare, escaladarea alertelor de churn este plasată în subgraph-ul churn E5, cu politici de familie comune (telemetrie, guardrails la nivel de familie — vezi ADR, nu câmpurile sinapsei).

## Sinapse dependență în același traseu

[`churn-alert-escalate-campaign-cluster-launch.md`](churn-alert-escalate-campaign-cluster-launch.md), [`churn-alert-escalate-referral-consent-expire.md`](churn-alert-escalate-referral-consent-expire.md), [`churn-alert-escalate-referral-consent-request.md`](churn-alert-escalate-referral-consent-request.md), [`churn-alert-escalate-referral-eligibility-check.md`](churn-alert-escalate-referral-eligibility-check.md), [`churn-alert-escalate-referral-neighbor-approach.md`](churn-alert-escalate-referral-neighbor-approach.md), [`churn-alert-escalate-referral-potential-tag.md`](churn-alert-escalate-referral-potential-tag.md), [`churn-alert-escalate-referral-request-prepare.md`](churn-alert-escalate-referral-request-prepare.md), [`churn-alert-escalate-referral-request-send.md`](churn-alert-escalate-referral-request-send.md), [`churn-alert-escalate-referral-response-process.md`](churn-alert-escalate-referral-response-process.md), [`churn-alert-escalate-referral-reward-process.md`](churn-alert-escalate-referral-reward-process.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | `churn:risk:escalate` / `e5:churn:risk-escalate` — vezi contract sursă. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `churn:alert:escalate` la **L253** (fișier). |
| **Planificare** | v2 §7 — `churn-alert-escalate` → `e5-churn`, `default`. |

## Limite și reconcilieri

- Nu extrapola din muchia `default` ordinea job-urilor față de alte trasee churn.
- **Graf vs registry:** denumiri diferite alertă vs risk-escalate — documentate în contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-alert-escalate-family\``.
