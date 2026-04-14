# Sinapsă `credit-data-fetch-anaf-contract-template-select`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-anaf-contract-template-select` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-anaf/credit-data-fetch-anaf-contract-template-select.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-anaf` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-anaf` | **Contract:** [`../../../neurons/E4/credit--data--fetch-anaf.md`](../../../neurons/E4/credit--data--fetch-anaf.md). **Runtime (ADR-0001):** `credit:data:fetch-anaf` — `E4_CREDIT_DATA_FETCH_ANAF` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-template-select` | **Contract (neuron):** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). **Traseu sinapse:** [`../contract-template-select/`](../contract-template-select/). **Runtime:** vezi neuron — reconciliere graf `contract-template-select` vs coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-anaf** (în v2: ingest date fiscale ANAF pentru profil credit) depinde în planificare de **selecția șablonului / clauzelor** (`contract-template-select`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie câmpuri ANAF, cache Redis sau coduri clauză.

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

- **Runtime (ADR-0001):** vezi contracte neuron sursă și destinație — cozi distincte unde sunt declarate în registry.
- **Semantic (ADR-0002):** `e4:credit:data-fetch-anaf` ↔ etapa contracte E4 pentru selecție șablon — vezi `cognitive-node-catalog.ts` în contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-anaf` → `contract-template-select`.

## Limite și reconcilieri

- Reconciliere denumiri coadă la destinație: obligatoriu [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-anaf-contract-template-select\``.
