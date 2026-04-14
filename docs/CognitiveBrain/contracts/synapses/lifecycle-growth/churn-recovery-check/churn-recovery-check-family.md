# Sinapsă `churn-recovery-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-recovery-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-recovery-check/churn-recovery-check-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-recovery-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-recovery-check` | **Graf:** verificare recuperare churn. Contract neuron: [`../../../neurons/E5/churn--recovery--check.md`](../../../neurons/E5/churn--recovery--check.md). **v2_queue:** `churn:recovery:check`. |
| Destinație (graf) | `e5-churn` | Agregat **`e5-churn`**. v2: [`### ADR-FAMILY-e5-churn`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e5/churn.md`](../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **churn-recovery-check** sub **`e5-churn`**, descriere v2 **„specializează familia”**: verificarea stării de recuperare este, în planificare, parte a subgraph-ului churn E5 comun celorlalte trasee din familie.

## Sinapse dependență în același traseu

[`churn-recovery-check-campaign-cluster-launch.md`](churn-recovery-check-campaign-cluster-launch.md), [`churn-recovery-check-referral-consent-expire.md`](churn-recovery-check-referral-consent-expire.md), [`churn-recovery-check-referral-consent-request.md`](churn-recovery-check-referral-consent-request.md), [`churn-recovery-check-referral-eligibility-check.md`](churn-recovery-check-referral-eligibility-check.md), [`churn-recovery-check-referral-neighbor-approach.md`](churn-recovery-check-referral-neighbor-approach.md), [`churn-recovery-check-referral-potential-tag.md`](churn-recovery-check-referral-potential-tag.md), [`churn-recovery-check-referral-request-prepare.md`](churn-recovery-check-referral-request-prepare.md), [`churn-recovery-check-referral-request-send.md`](churn-recovery-check-referral-request-send.md), [`churn-recovery-check-referral-response-process.md`](churn-recovery-check-referral-response-process.md), [`churn-recovery-check-referral-reward-process.md`](churn-recovery-check-referral-reward-process.md).

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
| **Runtime (ADR-0001)** | Vezi contract neuron și registry. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `churn:recovery:check` la **L256** (fișier). |
| **Planificare** | v2 §7 — `churn-recovery-check` → `e5-churn`. |

## Limite și reconcilieri

- Sinapsa nu afirmă rezultatul verificării de recuperare — doar poziția în graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-recovery-check-family\``.
