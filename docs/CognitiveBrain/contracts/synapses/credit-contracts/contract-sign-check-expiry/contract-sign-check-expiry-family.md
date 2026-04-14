# Sinapsă `contract-sign-check-expiry-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-check-expiry-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-check-expiry/contract-sign-check-expiry-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-check-expiry` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-sign-check-expiry` | Traseu în graf; contract neuron: [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md). **Runtime (ADR-0001):** neuronul documentează mapare **graf → coadă** (`contract:status:poll`); nu presupuneți identitate literală între eticheta nodului graf și numele cozii — vezi contract. **Semantic (ADR-0002):** `e4:contract:status-poll` (cu nuanțe de notare în contract). |
| Destinație (graf) | `e4-contracts` | Agregat **familie contracte E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/contracts.md`](../../../adr/families/e4/contracts.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **verificare semnătură / expirare envelope (model graf)** sub agregatul **`e4-contracts`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; logica temporală și DocuSign rămân în contractul neuron și în cod.

## Sinapse dependență în același traseu

[`contract-sign-check-expiry-return-process-stock.md`](contract-sign-check-expiry-return-process-stock.md), [`contract-sign-check-expiry-return-request-create.md`](contract-sign-check-expiry-return-request-create.md), [`contract-sign-check-expiry-sameday-awb-create.md`](contract-sign-check-expiry-sameday-awb-create.md), [`contract-sign-check-expiry-sameday-cod-process.md`](contract-sign-check-expiry-sameday-cod-process.md), [`contract-sign-check-expiry-sameday-pickup-schedule.md`](contract-sign-check-expiry-sameday-pickup-schedule.md), [`contract-sign-check-expiry-sameday-return-initiate.md`](contract-sign-check-expiry-sameday-return-initiate.md), [`contract-sign-check-expiry-sameday-status-poll.md`](contract-sign-check-expiry-sameday-status-poll.md), [`contract-sign-check-expiry-sameday-status-process.md`](contract-sign-check-expiry-sameday-status-process.md), [`contract-sign-check-expiry-stock-deduct-delivered.md`](contract-sign-check-expiry-stock-deduct-delivered.md), [`contract-sign-check-expiry-stock-release-order.md`](contract-sign-check-expiry-stock-release-order.md), [`contract-sign-check-expiry-stock-reserve-order.md`](contract-sign-check-expiry-stock-reserve-order.md), [`contract-sign-check-expiry-stock-sync-oblio.md`](contract-sign-check-expiry-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** `e4-contracts` nu este cheie în `QUEUES`; sursa este tratată în contract neuron pentru coada efectivă.
- **Semantic (ADR-0002):** familia `contracts` (v2) pentru sursă; ținta este agregat planificare.
- **Planificare:** v2 §7 — `contract-sign-check-expiry` → `e4-contracts`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Orice nealinieri OTel / catalog: vezi [`../../../neurons/E4/contract--sign--check-expiry.md`](../../../neurons/E4/contract--sign--check-expiry.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-check-expiry-family\``.
