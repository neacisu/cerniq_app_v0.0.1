# Sinapsă `contract-archive-store-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-archive-store-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-archive-store/contract-archive-store-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-archive-store` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `contract-archive-store` | Traseu arhivare documente; [`../../../neurons/E3/contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md). **Reconciliere:** v2_queue graf `contract:archive:store` → **runtime** `document:archive:store`, **Semantic (ADR-0002):** `e3:document:archive-store` — etapă **E3** în contractul neuron (atenție la tensiune cu agregatul destinație E4 din graf). |
| Destinație (graf) | `e4-contracts` | Agregat familie **contracts** (planificare E4); [`../../../../adr/families/e4/contracts.md`](../../../../adr/families/e4/contracts.md); v2 `ADR-FAMILY-e4-contracts`. Nu este o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **contract-archive-store** sub **`e4-contracts`** în graful de planificare. v2: **„specializează familia”** — fără payload/retry/safety/telemetrie pe muchie; operațiunea de arhivare și maparea cozii sunt în contractul neuron E3, nu în exportul sinapsei.

## Sinapse dependență în același traseu

[`contract-archive-store-return-process-stock.md`](contract-archive-store-return-process-stock.md), [`contract-archive-store-return-request-create.md`](contract-archive-store-return-request-create.md), [`contract-archive-store-sameday-awb-create.md`](contract-archive-store-sameday-awb-create.md), [`contract-archive-store-sameday-cod-process.md`](contract-archive-store-sameday-cod-process.md), [`contract-archive-store-sameday-pickup-schedule.md`](contract-archive-store-sameday-pickup-schedule.md), [`contract-archive-store-sameday-return-initiate.md`](contract-archive-store-sameday-return-initiate.md), [`contract-archive-store-sameday-status-poll.md`](contract-archive-store-sameday-status-poll.md), [`contract-archive-store-sameday-status-process.md`](contract-archive-store-sameday-status-process.md), [`contract-archive-store-stock-deduct-delivered.md`](contract-archive-store-stock-deduct-delivered.md), [`contract-archive-store-stock-release-order.md`](contract-archive-store-stock-release-order.md), [`contract-archive-store-stock-reserve-order.md`](contract-archive-store-stock-reserve-order.md), [`contract-archive-store-stock-sync-oblio.md`](contract-archive-store-stock-sync-oblio.md).

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

- **Runtime (ADR-0001):** sursa — `document:archive:store` (vezi neuron); `e4-contracts` nu este coadă.
- **Semantic (ADR-0002):** neuron **E3** pentru sursă vs etichetă familie **contracts** în agregat — documentat în [`contract--archive--store.md`](../../../neurons/E3/contract--archive--store.md).
- **Planificare:** v2 §7 — `contract-archive-store` → `e4-contracts`.

## Limite și reconcilieri

- **Graf vs etapă:** plasarea sub `e4-contracts` este decizie de planificare; implementarea arhivării este auditată ca **E3** — nu echivala agregatul cu stadiul runtime fără reconciliere.
- Fără inventare de payload sau politici din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-archive-store-family\``.
