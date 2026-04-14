# Sinapsă `contract-generate-docx-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-docx-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-docx/contract-generate-docx-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-docx` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-generate-docx` | Traseu generare contract DOCX; [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Reconciliere:** graf v2 `contract:generate:docx` → **runtime** `contract:generate` (G32); **Semantic (ADR-0002):** `e4:contract:generate`. |
| Destinație (graf) | `e4-contracts` | Agregat familie contracts; [`../../../../adr/families/e4/contracts.md`](../../../../adr/families/e4/contracts.md); v2 `ADR-FAMILY-e4-contracts`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **contract-generate-docx** sub **`e4-contracts`**. v2: **„specializează familia”** — fără payload/retry/safety/telemetrie pe muchie; generarea DOCX/PDF și lanțul către G33 sunt în contractul neuron.

## Sinapse dependență în același traseu

[`contract-generate-docx-return-process-stock.md`](contract-generate-docx-return-process-stock.md), [`contract-generate-docx-return-request-create.md`](contract-generate-docx-return-request-create.md), [`contract-generate-docx-sameday-awb-create.md`](contract-generate-docx-sameday-awb-create.md), [`contract-generate-docx-sameday-cod-process.md`](contract-generate-docx-sameday-cod-process.md), [`contract-generate-docx-sameday-pickup-schedule.md`](contract-generate-docx-sameday-pickup-schedule.md), [`contract-generate-docx-sameday-return-initiate.md`](contract-generate-docx-sameday-return-initiate.md), [`contract-generate-docx-sameday-status-poll.md`](contract-generate-docx-sameday-status-poll.md), [`contract-generate-docx-sameday-status-process.md`](contract-generate-docx-sameday-status-process.md), [`contract-generate-docx-stock-deduct-delivered.md`](contract-generate-docx-stock-deduct-delivered.md), [`contract-generate-docx-stock-release-order.md`](contract-generate-docx-stock-release-order.md), [`contract-generate-docx-stock-reserve-order.md`](contract-generate-docx-stock-reserve-order.md), [`contract-generate-docx-stock-sync-oblio.md`](contract-generate-docx-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** coadă efectivă `contract:generate` — vezi registry / neuron sursă.
- **Semantic (ADR-0002):** `e4:contract:generate`; agregat `e4-contracts` nu este coadă.
- **Planificare:** v2 §7 — `contract-generate-docx` → `e4-contracts`.

## Limite și reconcilieri

- Eticheta **docx** din graf ≠ numele unic al cozii runtime — vezi [`contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md).
- Fără inventare de payload sau politici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-docx-family\``.
