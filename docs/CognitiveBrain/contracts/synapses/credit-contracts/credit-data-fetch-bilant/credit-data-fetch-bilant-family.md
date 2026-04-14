# Sinapsă `credit-data-fetch-bilant-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-bilant-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-bilant/credit-data-fetch-bilant-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-bilant` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-data-fetch-bilant` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). **Runtime (ADR-0001):** `credit:data:fetch-bilant` — `E4_CREDIT_DATA_FETCH_BILANT`. **Semantic (ADR-0002):** `e4:credit:data-fetch-bilant`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **fetch bilanț contabil (credit)** (`credit-data-fetch-bilant`) sub agregatul **`e4-credit`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; indicatorii din bilanț și politicile din contractul neuron rămân în cod, nu în această muchie.

## Sinapse dependență în același traseu

[`credit-data-fetch-bilant-contract-archive-store.md`](credit-data-fetch-bilant-contract-archive-store.md), [`credit-data-fetch-bilant-contract-clause-assemble.md`](credit-data-fetch-bilant-contract-clause-assemble.md), [`credit-data-fetch-bilant-contract-generate-docx.md`](credit-data-fetch-bilant-contract-generate-docx.md), [`credit-data-fetch-bilant-contract-generate-notice.md`](credit-data-fetch-bilant-contract-generate-notice.md), [`credit-data-fetch-bilant-contract-sign-check-expiry.md`](credit-data-fetch-bilant-contract-sign-check-expiry.md), [`credit-data-fetch-bilant-contract-sign-complete.md`](credit-data-fetch-bilant-contract-sign-complete.md), [`credit-data-fetch-bilant-contract-sign-request.md`](credit-data-fetch-bilant-contract-sign-request.md), [`credit-data-fetch-bilant-contract-template-select.md`](credit-data-fetch-bilant-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_DATA_FETCH_BILANT` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:data-fetch-bilant`.
- **Planificare:** v2 §7 — `credit-data-fetch-bilant` → `e4-credit`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Alte intrări în graf către `credit-data-fetch-bilant` sunt sinapse **distincte** în v2 §7 — nu le confunda cu manifestul de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-bilant-family\``.
