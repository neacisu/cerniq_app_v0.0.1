# Sinapsă `credit-data-fetch-insolventa-contract-template-select`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-insolventa-contract-template-select` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-insolventa/credit-data-fetch-insolventa-contract-template-select.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-insolventa` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-insolventa` | **Contract:** [`../../../neurons/E4/credit--data--fetch-insolventa.md`](../../../neurons/E4/credit--data--fetch-insolventa.md). **Runtime (ADR-0001):** v2 `credit:data:fetch-insolventa` **nu** are intrare în `queue-registry.ts`; acoperire **parțială** prin **`credit:data:fetch-bpi`** (C16) pentru structuri insolvență — vezi contract neuron. |
| Destinație (graf) | `contract-template-select` | **Contract (neuron):** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). **Traseu sinapse:** [`../contract-template-select/`](../contract-template-select/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-insolventa** (în v2: neuron graf pentru proceduri insolvență) depinde în planificare de **selecția șablonului / clauzelor** (`contract-template-select`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie stadiul procedurii sau coduri clauză.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** nod graf `credit-data-fetch-insolventa` **nu** mapare 1:1 la coadă dedicată — reconciliere prin BPI; vezi contract sursă.
- **Semantic (ADR-0002):** catalog: `e4:credit:data-fetch-bpi` — vezi `cognitive-node-catalog.ts` în contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-insolventa` → `contract-template-select`.

## Limite și reconcilieri

- Nu există evidență în registry pentru job izolat „insolvență-only”; detaliile câmpurilor sunt în worker BPI și contractele neuron asociate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-insolventa-contract-template-select\``.
