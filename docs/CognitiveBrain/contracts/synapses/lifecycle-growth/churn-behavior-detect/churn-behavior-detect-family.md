# Sinapsă `churn-behavior-detect-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-behavior-detect-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-behavior-detect/churn-behavior-detect-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-behavior-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-behavior-detect` | **Graf:** detectare comportament churn. Contract neuron: [`../../../neurons/E5/churn--behavior--detect.md`](../../../neurons/E5/churn--behavior--detect.md). **Triplă autoritate:** v2 `churn:behavior:detect`; în catalog apare `e5:decay:behavior-detect` — vezi contract pentru mapare. |
| Destinație (graf) | `e5-churn` | Agregat **`e5-churn`**. v2: [`### ADR-FAMILY-e5-churn`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e5/churn.md`](../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **churn-behavior-detect** sub **`e5-churn`**, descriere v2 **„specializează familia”**: detectarea comportamentului asociată riscului de churn este, în planificare, parte a aceluiași agregat de familie churn ca celelalte trasee din jurul churn-ului E5.

## Sinapse dependență în același traseu

[`churn-behavior-detect-campaign-cluster-launch.md`](churn-behavior-detect-campaign-cluster-launch.md), [`churn-behavior-detect-referral-consent-expire.md`](churn-behavior-detect-referral-consent-expire.md), [`churn-behavior-detect-referral-consent-request.md`](churn-behavior-detect-referral-consent-request.md), [`churn-behavior-detect-referral-eligibility-check.md`](churn-behavior-detect-referral-eligibility-check.md), [`churn-behavior-detect-referral-neighbor-approach.md`](churn-behavior-detect-referral-neighbor-approach.md), [`churn-behavior-detect-referral-potential-tag.md`](churn-behavior-detect-referral-potential-tag.md), [`churn-behavior-detect-referral-request-prepare.md`](churn-behavior-detect-referral-request-prepare.md), [`churn-behavior-detect-referral-request-send.md`](churn-behavior-detect-referral-request-send.md), [`churn-behavior-detect-referral-response-process.md`](churn-behavior-detect-referral-response-process.md), [`churn-behavior-detect-referral-reward-process.md`](churn-behavior-detect-referral-reward-process.md).

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
| **Runtime (ADR-0001)** | Decay / behavior — vezi contract neuron și registry. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `churn:behavior:detect` la **L254** (fișier). |
| **Planificare** | v2 §7 — `churn-behavior-detect` → `e5-churn`. |

## Limite și reconcilieri

- Orice decalaj între eticheta de graf și `nodeKey` din catalog este tratat în contractul neuron, nu negat aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-behavior-detect-family\``.
