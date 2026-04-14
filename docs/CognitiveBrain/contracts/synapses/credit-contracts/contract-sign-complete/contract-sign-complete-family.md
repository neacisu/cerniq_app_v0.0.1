# Sinapsă `contract-sign-complete-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-complete-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-complete/contract-sign-complete-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-sign-complete` | Traseu în graf; contract neuron: [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). **Runtime (ADR-0001):** neuronul documentează mapare **graf → coadă** (`contract:signed:process`); vezi contract pentru nealinieri span/catalog. **Semantic (ADR-0002):** `e4:contract:signed-process` (notare în catalog). |
| Destinație (graf) | `e4-contracts` | Agregat **familie contracte E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/contracts.md`](../../../adr/families/e4/contracts.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **finalizare semnătură contract (procesare semnat, model graf)** sub agregatul **`e4-contracts`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`contract-sign-complete-return-process-stock.md`](contract-sign-complete-return-process-stock.md), [`contract-sign-complete-return-request-create.md`](contract-sign-complete-return-request-create.md), [`contract-sign-complete-sameday-awb-create.md`](contract-sign-complete-sameday-awb-create.md), [`contract-sign-complete-sameday-cod-process.md`](contract-sign-complete-sameday-cod-process.md), [`contract-sign-complete-sameday-pickup-schedule.md`](contract-sign-complete-sameday-pickup-schedule.md), [`contract-sign-complete-sameday-return-initiate.md`](contract-sign-complete-sameday-return-initiate.md), [`contract-sign-complete-sameday-status-poll.md`](contract-sign-complete-sameday-status-poll.md), [`contract-sign-complete-sameday-status-process.md`](contract-sign-complete-sameday-status-process.md), [`contract-sign-complete-stock-deduct-delivered.md`](contract-sign-complete-stock-deduct-delivered.md), [`contract-sign-complete-stock-release-order.md`](contract-sign-complete-stock-release-order.md), [`contract-sign-complete-stock-reserve-order.md`](contract-sign-complete-stock-reserve-order.md), [`contract-sign-complete-stock-sync-oblio.md`](contract-sign-complete-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** `e4-contracts` nu este cheie în `QUEUES`; sursa — vezi contract neuron.
- **Semantic (ADR-0002):** familia `contracts` (v2).
- **Planificare:** v2 §7 — `contract-sign-complete` → `e4-contracts`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-complete-family\``.
