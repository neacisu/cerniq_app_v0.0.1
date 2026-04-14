# Sinapsă `contract-generate-notice-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-notice-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-notice/contract-generate-notice-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-notice` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-generate-notice` | Traseu planificat generare notificare/act; [`../../../neurons/E4/contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md). **v2:** coadă `contract:generate:notice`. **Runtime (ADR-0001) / Semantic (ADR-0002):** contractul neuron documentează **lipsă** mapare la `queue-registry.ts` și `cognitive-node-catalog.ts` la audit — **nu** afirma handler/coadă executabilă fără reconciliere. |
| Destinație (graf) | `e4-contracts` | Agregat familie contracts; [`../../../../adr/families/e4/contracts.md`](../../../../adr/families/e4/contracts.md); v2 `ADR-FAMILY-e4-contracts`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **contract-generate-notice** sub **`e4-contracts`**. v2: **„specializează familia”** — fără payload/retry/safety/telemetrie pe muchie. Poziția în graf **nu** înlocuiește dovada de implementare runtime pentru sursă.

## Sinapse dependență în același traseu

[`contract-generate-notice-return-process-stock.md`](contract-generate-notice-return-process-stock.md), [`contract-generate-notice-return-request-create.md`](contract-generate-notice-return-request-create.md), [`contract-generate-notice-sameday-awb-create.md`](contract-generate-notice-sameday-awb-create.md), [`contract-generate-notice-sameday-cod-process.md`](contract-generate-notice-sameday-cod-process.md), [`contract-generate-notice-sameday-pickup-schedule.md`](contract-generate-notice-sameday-pickup-schedule.md), [`contract-generate-notice-sameday-return-initiate.md`](contract-generate-notice-sameday-return-initiate.md), [`contract-generate-notice-sameday-status-poll.md`](contract-generate-notice-sameday-status-poll.md), [`contract-generate-notice-sameday-status-process.md`](contract-generate-notice-sameday-status-process.md), [`contract-generate-notice-stock-deduct-delivered.md`](contract-generate-notice-stock-deduct-delivered.md), [`contract-generate-notice-stock-release-order.md`](contract-generate-notice-stock-release-order.md), [`contract-generate-notice-stock-reserve-order.md`](contract-generate-notice-stock-reserve-order.md), [`contract-generate-notice-stock-sync-oblio.md`](contract-generate-notice-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** sursa — **gap** documentat la neuron; `e4-contracts` nu este coadă.
- **Semantic (ADR-0002):** **fără** `nodeKey` confirmat în catalog pentru acest antet la audit — vezi neuron.
- **Planificare:** v2 §7 — `contract-generate-notice` → `e4-contracts`.

## Limite și reconcilieri

- Traseul există în **graf**; alinierea la workers și cozi necesită pași expliciți de reconciliere — vezi [`contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md) și ADR `e4/contracts`.
- Fără inventare de payload sau politici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-notice-family\``.
