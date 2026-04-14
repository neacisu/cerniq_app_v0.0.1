# Sinapsă `churn-sentiment-analyze-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `churn-sentiment-analyze-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/churn-sentiment-analyze/churn-sentiment-analyze-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `churn-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `churn-sentiment-analyze` | **Graf:** analiză sentiment în context churn. Contract neuron: [`../../../neurons/E2/churn--sentiment--analyze.md`](../../../neurons/E2/churn--sentiment--analyze.md). **v2:** `churn:sentiment:analyze`; **catalog** (`e2:ai:sentiment-analyze`) plasează neuronul în **E2** — vezi contract. |
| Destinație (graf) | `e5-churn` | Agregat planificare **`e5-churn`** (familie churn în export). v2: [`### ADR-FAMILY-e5-churn`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR churn E5: [`../../../adr/families/e5/churn.md`](../../../adr/families/e5/churn.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **churn-sentiment-analyze** sub agregatul **`e5-churn`**, descriere v2 **„specializează familia”**. În **planificare**, analiza sentimentului legată de churn este grupată la nivel de familie churn E5; **contractul neuron** indică însă **etapa E2** și `nodeKey` AI — reconciliere explicită: *graf familie (e5-churn) vs etapă/execuție neuron (E2)*.

## Sinapse dependență în același traseu

[`churn-sentiment-analyze-campaign-cluster-launch.md`](churn-sentiment-analyze-campaign-cluster-launch.md), [`churn-sentiment-analyze-referral-consent-expire.md`](churn-sentiment-analyze-referral-consent-expire.md), [`churn-sentiment-analyze-referral-consent-request.md`](churn-sentiment-analyze-referral-consent-request.md), [`churn-sentiment-analyze-referral-eligibility-check.md`](churn-sentiment-analyze-referral-eligibility-check.md), [`churn-sentiment-analyze-referral-neighbor-approach.md`](churn-sentiment-analyze-referral-neighbor-approach.md), [`churn-sentiment-analyze-referral-potential-tag.md`](churn-sentiment-analyze-referral-potential-tag.md), [`churn-sentiment-analyze-referral-request-prepare.md`](churn-sentiment-analyze-referral-request-prepare.md), [`churn-sentiment-analyze-referral-request-send.md`](churn-sentiment-analyze-referral-request-send.md), [`churn-sentiment-analyze-referral-response-process.md`](churn-sentiment-analyze-referral-response-process.md), [`churn-sentiment-analyze-referral-reward-process.md`](churn-sentiment-analyze-referral-reward-process.md).

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
| **Runtime (ADR-0001)** | Execuție AI sentiment — vezi contract E2 și registry. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `churn:sentiment:analyze` la **L257** (fișier). |
| **Planificare** | v2 §7 — sursă `churn-sentiment-analyze` → destinație `e5-churn`. |

## Limite și reconcilieri

- **E5-churn** în graf nu înseamnă automat că workerul rulează în worker pool E5; urmăriți contractul neuron și etapa din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`churn-sentiment-analyze-family\``.
