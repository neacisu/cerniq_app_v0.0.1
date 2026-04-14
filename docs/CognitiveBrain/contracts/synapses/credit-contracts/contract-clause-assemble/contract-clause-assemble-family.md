# Sinapsă `contract-clause-assemble-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-clause-assemble-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-clause-assemble/contract-clause-assemble-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-clause-assemble` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-clause-assemble` | Traseu asamblare clauze; [`../../../neurons/E4/contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md). **Reconciliere:** graf v2 `contract:clause:assemble` → **runtime** `contract:clauses:select`; **Semantic (ADR-0002):** `e4:contract:clauses-select` — vezi contract neuron pentru tensiuni span/catalog. |
| Destinație (graf) | `e4-contracts` | Agregat familie contracts; [`../../../../adr/families/e4/contracts.md`](../../../../adr/families/e4/contracts.md); v2 `ADR-FAMILY-e4-contracts`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **contract-clause-assemble** sub **`e4-contracts`**. v2: **„specializează familia”** — fără payload/retry/safety/telemetrie pe muchie; selecția clauzelor și enqueue G34 sunt în contractul neuron, nu în export.

## Sinapse dependență în același traseu

[`contract-clause-assemble-return-process-stock.md`](contract-clause-assemble-return-process-stock.md), [`contract-clause-assemble-return-request-create.md`](contract-clause-assemble-return-request-create.md), [`contract-clause-assemble-sameday-awb-create.md`](contract-clause-assemble-sameday-awb-create.md), [`contract-clause-assemble-sameday-cod-process.md`](contract-clause-assemble-sameday-cod-process.md), [`contract-clause-assemble-sameday-pickup-schedule.md`](contract-clause-assemble-sameday-pickup-schedule.md), [`contract-clause-assemble-sameday-return-initiate.md`](contract-clause-assemble-sameday-return-initiate.md), [`contract-clause-assemble-sameday-status-poll.md`](contract-clause-assemble-sameday-status-poll.md), [`contract-clause-assemble-sameday-status-process.md`](contract-clause-assemble-sameday-status-process.md), [`contract-clause-assemble-stock-deduct-delivered.md`](contract-clause-assemble-stock-deduct-delivered.md), [`contract-clause-assemble-stock-release-order.md`](contract-clause-assemble-stock-release-order.md), [`contract-clause-assemble-stock-reserve-order.md`](contract-clause-assemble-stock-reserve-order.md), [`contract-clause-assemble-stock-sync-oblio.md`](contract-clause-assemble-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** coadă efectivă `contract:clauses:select` — vezi registry / neuron sursă.
- **Semantic (ADR-0002):** `e4:contract:clauses-select`; agregat `e4-contracts` nu este coadă.
- **Planificare:** v2 §7 — `contract-clause-assemble` → `e4-contracts`.

## Limite și reconcilieri

- Eticheta graf **clause-assemble** ≠ literal cozii runtime — obligatoriu consultat [`contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md).
- Fără inventare de payload sau politici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-clause-assemble-family\``.
