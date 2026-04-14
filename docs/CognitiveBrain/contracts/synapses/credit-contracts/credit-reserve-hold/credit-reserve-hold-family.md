# Sinapsă `credit-reserve-hold-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-reserve-hold-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-reserve-hold/credit-reserve-hold-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-reserve-hold` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-reserve-hold` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--reserve--hold.md`](../../../neurons/E4/credit--reserve--hold.md). **Runtime (ADR-0001):** coada executabilă este `credit:limit:reserve` — `E4_CREDIT_LIMIT_RESERVE` în `workers/shared/src/queue-registry.ts`. v2 folosește eticheta `credit:reserve:hold` pentru neuron — **reconciliere** cu registry în contractul neuron și `NEURON_MATRIX.csv` (`e4:credit:limit-reserve`). **Semantic (ADR-0002):** `e4:credit:limit-reserve`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **rezervare limită credit / hold** (`credit-reserve-hold`, neuron `credit:reserve:hold` în v2) sub agregatul **`e4-credit`**. v2 descrie rezervare cu TTL și legătură la expirare prin `pipeline:reservation:expire` — detaliile în contractul neuron. v2: **„specializează familia”**; fără payload în exportul muchiei.

## Sinapse dependență în același traseu

[`credit-reserve-hold-contract-archive-store.md`](credit-reserve-hold-contract-archive-store.md), [`credit-reserve-hold-contract-clause-assemble.md`](credit-reserve-hold-contract-clause-assemble.md), [`credit-reserve-hold-contract-generate-docx.md`](credit-reserve-hold-contract-generate-docx.md), [`credit-reserve-hold-contract-generate-notice.md`](credit-reserve-hold-contract-generate-notice.md), [`credit-reserve-hold-contract-sign-check-expiry.md`](credit-reserve-hold-contract-sign-check-expiry.md), [`credit-reserve-hold-contract-sign-complete.md`](credit-reserve-hold-contract-sign-complete.md), [`credit-reserve-hold-contract-sign-request.md`](credit-reserve-hold-contract-sign-request.md), [`credit-reserve-hold-contract-template-select.md`](credit-reserve-hold-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_LIMIT_RESERVE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` (v2), nod catalog `e4:credit:limit-reserve`.
- **Planificare:** v2 §7 — `credit-reserve-hold` → `e4-credit`.

## Limite și reconcilieri

- Nu se inventează payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs registry:** `credit-reserve-hold` ≠ literal `credit:limit:reserve` ca etichetă graf, dar maparea este documentată în neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-reserve-hold-family\``.
