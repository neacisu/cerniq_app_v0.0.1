# Sinapsă `credit-reserve-expire-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-reserve-expire-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-reserve-expire/credit-reserve-expire-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-reserve-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-reserve-expire` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--reserve--expire.md`](../../../neurons/E4/credit--reserve--expire.md). **Runtime (ADR-0001):** coada executabilă este `pipeline:reservation:expire` — `E4_RESERVATION_EXPIRE` în `workers/shared/src/queue-registry.ts`. v2 folosește eticheta `credit:reserve:expire` pentru neuron; coada este **pipeline** (transversală), nu prefix `credit:*` literal — vezi contract neuron. **Semantic (ADR-0002):** `e4:pipeline:reservation-expire`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **expirare rezervări credit** (`credit-reserve-expire`) sub agregatul **`e4-credit`**. În implementare, job-ul este aliniat la cozi `pipeline:*` pentru expirare batch (vezi neuron). v2: **„specializează familia”**; fără payload în exportul muchiei.

## Sinapse dependență în același traseu

[`credit-reserve-expire-contract-archive-store.md`](credit-reserve-expire-contract-archive-store.md), [`credit-reserve-expire-contract-clause-assemble.md`](credit-reserve-expire-contract-clause-assemble.md), [`credit-reserve-expire-contract-generate-docx.md`](credit-reserve-expire-contract-generate-docx.md), [`credit-reserve-expire-contract-generate-notice.md`](credit-reserve-expire-contract-generate-notice.md), [`credit-reserve-expire-contract-sign-check-expiry.md`](credit-reserve-expire-contract-sign-check-expiry.md), [`credit-reserve-expire-contract-sign-complete.md`](credit-reserve-expire-contract-sign-complete.md), [`credit-reserve-expire-contract-sign-request.md`](credit-reserve-expire-contract-sign-request.md), [`credit-reserve-expire-contract-template-select.md`](credit-reserve-expire-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_RESERVATION_EXPIRE` — vezi contract neuron.
- **Semantic (ADR-0002):** familia `credit` în v2, nod catalog `e4:pipeline:reservation-expire`.
- **Planificare:** v2 §7 — `credit-reserve-expire` → `e4-credit`.

## Limite și reconcilieri

- Nu se inventează payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** nodul `credit-reserve-expire` nu trebuie confundat cu o coadă `credit:reserve:expire` în registry — dovada cozii este `pipeline:reservation:expire`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-reserve-expire-family\``.
