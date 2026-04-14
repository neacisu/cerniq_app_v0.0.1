# Sinapsă `credit-score-calculate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-score-calculate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-score-calculate/credit-score-calculate-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-score-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-score-calculate` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--score--calculate.md`](../../../neurons/E4/credit--score--calculate.md). **Runtime (ADR-0001):** `credit:score:calculate` — `E4_CREDIT_SCORE_CALCULATE` în `workers/shared/src/queue-registry.ts`. **Semantic (ADR-0002):** `e4:credit:score-calculate` (catalog) — vezi neuron pentru notă despre divergență `score-calculate` vs `score:calculate` în telemetrie. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **calcul scor credit** (`credit-score-calculate`, neuron `credit:score:calculate` în v2) sub agregatul **`e4-credit`**. v2 descrie funcția ca *Calcul scor credit 100p (parent FlowJob după C14+C15+C16 complete)* și criticitate ridicată — detaliile operaționale în contractul neuron și cod. v2: **„specializează familia”**; fără payload în exportul muchiei.

## Sinapse dependență în același traseu

[`credit-score-calculate-contract-archive-store.md`](credit-score-calculate-contract-archive-store.md), [`credit-score-calculate-contract-clause-assemble.md`](credit-score-calculate-contract-clause-assemble.md), [`credit-score-calculate-contract-generate-docx.md`](credit-score-calculate-contract-generate-docx.md), [`credit-score-calculate-contract-generate-notice.md`](credit-score-calculate-contract-generate-notice.md), [`credit-score-calculate-contract-sign-check-expiry.md`](credit-score-calculate-contract-sign-check-expiry.md), [`credit-score-calculate-contract-sign-complete.md`](credit-score-calculate-contract-sign-complete.md), [`credit-score-calculate-contract-sign-request.md`](credit-score-calculate-contract-sign-request.md), [`credit-score-calculate-contract-template-select.md`](credit-score-calculate-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_SCORE_CALCULATE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:score-calculate`.
- **Planificare:** v2 §7 — `credit-score-calculate` → `e4-credit`.

## Limite și reconcilieri

- Nu se inventează payload / retry / safety / telemetrie pentru muchia `default`.
- **Catalog vs span OTel:** neuronul documentează o posibilă divergență între `nodeKey` cu cratimă și string-ul din `withCognitiveSpan` — sinapsa de familie **nu** o rezolvă; vezi [`../../../neurons/E4/credit--score--calculate.md`](../../../neurons/E4/credit--score--calculate.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-score-calculate-family\``.
