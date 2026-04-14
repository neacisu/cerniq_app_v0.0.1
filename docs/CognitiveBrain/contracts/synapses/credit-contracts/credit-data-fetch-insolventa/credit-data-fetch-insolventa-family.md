# Sinapsă `credit-data-fetch-insolventa-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-insolventa-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-insolventa/credit-data-fetch-insolventa-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-insolventa` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-data-fetch-insolventa` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--data--fetch-insolventa.md`](../../../neurons/E4/credit--data--fetch-insolventa.md). **Runtime (ADR-0001):** **fără** `QUEUES` dedicat — acoperire parțială prin **`E4_CREDIT_DATA_FETCH_BPI`** / `credit:data:fetch-bpi`. **Semantic:** `e4:credit:data-fetch-bpi` în catalog (vezi contracte). |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **proceduri insolvență (model graf)** (`credit-data-fetch-insolventa`) sub agregatul **`e4-credit`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei. **Reconciliere:** graful izolează insolvența ca nod, dar **nu** există încă worker dedicat doar pentru acest nod — vezi contractele `credit--data--fetch-insolventa.md` și `credit--data--fetch-bpi.md`.

## Sinapse dependență în același traseu

[`credit-data-fetch-insolventa-contract-archive-store.md`](credit-data-fetch-insolventa-contract-archive-store.md), [`credit-data-fetch-insolventa-contract-clause-assemble.md`](credit-data-fetch-insolventa-contract-clause-assemble.md), [`credit-data-fetch-insolventa-contract-generate-docx.md`](credit-data-fetch-insolventa-contract-generate-docx.md), [`credit-data-fetch-insolventa-contract-generate-notice.md`](credit-data-fetch-insolventa-contract-generate-notice.md), [`credit-data-fetch-insolventa-contract-sign-check-expiry.md`](credit-data-fetch-insolventa-contract-sign-check-expiry.md), [`credit-data-fetch-insolventa-contract-sign-complete.md`](credit-data-fetch-insolventa-contract-sign-complete.md), [`credit-data-fetch-insolventa-contract-sign-request.md`](credit-data-fetch-insolventa-contract-sign-request.md), [`credit-data-fetch-insolventa-contract-template-select.md`](credit-data-fetch-insolventa-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; pentru insolvență, dovada executării este **`credit:data:fetch-bpi`** — vezi contracte.
- **Semantic (ADR-0002):** familia `credit` (v2); fără `nodeKey` separat „insolvență” în catalog — vezi contract sursă.
- **Planificare:** v2 §7 — `credit-data-fetch-insolventa` → `e4-credit`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Acoperirea parțială BPI **nu** echivalează cu „neuron gol” în planificare — graf și runtime rămân distincte până la reconciliere completă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-insolventa-family\``.
