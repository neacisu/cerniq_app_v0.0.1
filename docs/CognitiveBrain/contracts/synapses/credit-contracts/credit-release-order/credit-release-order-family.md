# Sinapsă `credit-release-order-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-release-order-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-release-order/credit-release-order-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-release-order` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--release--order.md`](../../../neurons/E4/credit--release--order.md). **Runtime (ADR-0001):** coada executabilă este `credit:limit:release` — `E4_CREDIT_LIMIT_RELEASE` în `workers/shared/src/queue-registry.ts`. v2 folosește eticheta `credit:release:order` pentru neuron — **reconciliere** documentată în contractul neuron și în `NEURON_MATRIX.csv` (`e4:credit:limit-release`). **Semantic (ADR-0002):** `e4:credit:limit-release`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **eliberare rezervare / limit release** (`credit-release-order`, neuron `credit:release:order` în v2) sub agregatul **`e4-credit`**. v2 notează scop operațional orientat spre actualizarea profilului și porți de decizie după eliberare — detaliile stau în contractul neuron. v2: **„specializează familia”**; fără payload în exportul muchiei.

## Sinapse dependență în același traseu

[`credit-release-order-contract-archive-store.md`](credit-release-order-contract-archive-store.md), [`credit-release-order-contract-clause-assemble.md`](credit-release-order-contract-clause-assemble.md), [`credit-release-order-contract-generate-docx.md`](credit-release-order-contract-generate-docx.md), [`credit-release-order-contract-generate-notice.md`](credit-release-order-contract-generate-notice.md), [`credit-release-order-contract-sign-check-expiry.md`](credit-release-order-contract-sign-check-expiry.md), [`credit-release-order-contract-sign-complete.md`](credit-release-order-contract-sign-complete.md), [`credit-release-order-contract-sign-request.md`](credit-release-order-contract-sign-request.md), [`credit-release-order-contract-template-select.md`](credit-release-order-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_LIMIT_RELEASE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:limit-release`.
- **Planificare:** v2 §7 — `credit-release-order` → `e4-credit`.

## Limite și reconcilieri

- Nu se inventează payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs registry:** slug-ul `credit-release-order` nu este literal coada `credit:limit:release`; nu se confundă planificarea cu numele cozii.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-release-order-family\``.
