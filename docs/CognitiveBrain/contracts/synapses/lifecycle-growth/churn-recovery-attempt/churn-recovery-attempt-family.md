# Sinapsă `churn-recovery-attempt-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-recovery-attempt-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-recovery-attempt/churn-recovery-attempt-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-recovery-attempt` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-recovery-attempt` | **Graf:** tentativă de recuperare churn. Contract neuron: [`../../../neurons/E5/churn--recovery--attempt.md`](../../../neurons/E5/churn--recovery--attempt.md). **v2_queue:** `churn:recovery:attempt` — vezi contract pentru gap-uri runtime dacă există. |
| Destinație (graf) | `e5-churn` | Agregat **`e5-churn`**. v2: [`### ADR-FAMILY-e5-churn`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e5/churn.md`](../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **churn-recovery-attempt** de **`e5-churn`**, cu descrierea v2 **„specializează familia”**: eforturile de recuperare în fața churn-ului sunt modelate în planificare ca aparținând aceleiași familii agregate churn E5.

## Sinapse dependență în același traseu

[`churn-recovery-attempt-campaign-cluster-launch.md`](churn-recovery-attempt-campaign-cluster-launch.md), [`churn-recovery-attempt-referral-consent-expire.md`](churn-recovery-attempt-referral-consent-expire.md), [`churn-recovery-attempt-referral-consent-request.md`](churn-recovery-attempt-referral-consent-request.md), [`churn-recovery-attempt-referral-eligibility-check.md`](churn-recovery-attempt-referral-eligibility-check.md), [`churn-recovery-attempt-referral-neighbor-approach.md`](churn-recovery-attempt-referral-neighbor-approach.md), [`churn-recovery-attempt-referral-potential-tag.md`](churn-recovery-attempt-referral-potential-tag.md), [`churn-recovery-attempt-referral-request-prepare.md`](churn-recovery-attempt-referral-request-prepare.md), [`churn-recovery-attempt-referral-request-send.md`](churn-recovery-attempt-referral-request-send.md), [`churn-recovery-attempt-referral-response-process.md`](churn-recovery-attempt-referral-response-process.md), [`churn-recovery-attempt-referral-reward-process.md`](churn-recovery-attempt-referral-reward-process.md).

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
| **Runtime (ADR-0001)** | Vezi coloanele registry/catalog din [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) pentru acest rând și contractul neuron. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `churn:recovery:attempt` la **L255** (fișier). |
| **Planificare** | v2 §7 — `churn-recovery-attempt` → `e5-churn`. |

## Limite și reconcilieri

- **NEURON_MATRIX** poate indica gap față de runtime — nu contrazice sinapsa din export; reconcilierea rămâne în contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-recovery-attempt-family\``.
