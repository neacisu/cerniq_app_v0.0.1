# Sinapsă `credit-data-fetch-dosare-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-dosare-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-dosare/credit-data-fetch-dosare-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-dosare` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-data-fetch-dosare` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--data--fetch-dosare.md`](../../../neurons/E4/credit--data--fetch-dosare.md). **Runtime (ADR-0001):** v2 `credit:data:fetch-dosare` **fără** `QUEUES` dedicat — execuție prin **`E4_CREDIT_DATA_FETCH_BPI`** / `credit:data:fetch-bpi`. **Semantic:** vezi `e4:credit:data-fetch-bpi` în catalog (contract neuron). |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **date dosare instanță (model graf)** (`credit-data-fetch-dosare`) sub agregatul **`e4-credit`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei. **Reconciliere:** graful separă nodul „dosare”, dar worker-ul canonic pentru Termene+BPI este unic — vezi contractele `credit--data--fetch-dosare.md` și `credit--data--fetch-bpi.md`.

## Sinapse dependență în același traseu

[`credit-data-fetch-dosare-contract-archive-store.md`](credit-data-fetch-dosare-contract-archive-store.md), [`credit-data-fetch-dosare-contract-clause-assemble.md`](credit-data-fetch-dosare-contract-clause-assemble.md), [`credit-data-fetch-dosare-contract-generate-docx.md`](credit-data-fetch-dosare-contract-generate-docx.md), [`credit-data-fetch-dosare-contract-generate-notice.md`](credit-data-fetch-dosare-contract-generate-notice.md), [`credit-data-fetch-dosare-contract-sign-check-expiry.md`](credit-data-fetch-dosare-contract-sign-check-expiry.md), [`credit-data-fetch-dosare-contract-sign-complete.md`](credit-data-fetch-dosare-contract-sign-complete.md), [`credit-data-fetch-dosare-contract-sign-request.md`](credit-data-fetch-dosare-contract-sign-request.md), [`credit-data-fetch-dosare-contract-template-select.md`](credit-data-fetch-dosare-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; pentru dosare, coada executabilă este **`credit:data:fetch-bpi`** — vezi contracte.
- **Semantic (ADR-0002):** familia `credit` (v2); fără `nodeKey` separat „dosare” în catalog — vezi contract sursă.
- **Planificare:** v2 §7 — `credit-data-fetch-dosare` → `e4-credit`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Nu confunda acest manifest cu sinapsele care au **destinație** `credit-data-fetch-dosare` din alte trasee (ex. plăți) — acelea sunt intrări distincte în v2 §7.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-dosare-family\``.
