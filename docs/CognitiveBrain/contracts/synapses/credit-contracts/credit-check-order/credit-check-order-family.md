# Sinapsă `credit-check-order-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-check-order-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-check-order/credit-check-order-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-check-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `credit-check-order` | Traseu în graf; contract neuron: [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). **Runtime (ADR-0001):** v2 `credit:check:order` mapat la coadă **`credit:limit:check`** (D19) — vezi contract și `queue-registry.ts`. **Semantic (ADR-0002):** `e4:credit:limit-check`. |
| Destinație (graf) | `e4-credit` | Agregat **familie credit E4** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e4/credit.md`](../../../adr/families/e4/credit.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **verificare credit la comandă (model graf)** sub agregatul **`e4-credit`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; praguri, profil `gold_credit_profiles` și politica de respingere rămân în cod și în contractul neuron.

## Sinapse dependență în același traseu

[`credit-check-order-contract-archive-store.md`](credit-check-order-contract-archive-store.md), [`credit-check-order-contract-clause-assemble.md`](credit-check-order-contract-clause-assemble.md), [`credit-check-order-contract-generate-docx.md`](credit-check-order-contract-generate-docx.md), [`credit-check-order-contract-generate-notice.md`](credit-check-order-contract-generate-notice.md), [`credit-check-order-contract-sign-check-expiry.md`](credit-check-order-contract-sign-check-expiry.md), [`credit-check-order-contract-sign-complete.md`](credit-check-order-contract-sign-complete.md), [`credit-check-order-contract-sign-request.md`](credit-check-order-contract-sign-request.md), [`credit-check-order-contract-template-select.md`](credit-check-order-contract-template-select.md).

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

- **Runtime (ADR-0001):** `e4-credit` nu este cheie în `QUEUES`; sursa folosește `E4_CREDIT_LIMIT_CHECK` / `credit:limit:check` — vezi contract.
- **Semantic (ADR-0002):** familia `credit` (v2).
- **Planificare:** v2 §7 — `credit-check-order` → `e4-credit`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Comentariile din cod despre „nu blochează comanda” sunt în contract neuron, nu în sinapsa de familie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-check-order-family\``.
