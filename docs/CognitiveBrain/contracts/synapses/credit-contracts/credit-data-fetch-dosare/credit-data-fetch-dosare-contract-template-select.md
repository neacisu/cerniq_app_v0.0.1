# Sinapsă `credit-data-fetch-dosare-contract-template-select`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-dosare-contract-template-select` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-dosare/credit-data-fetch-dosare-contract-template-select.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-dosare` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-dosare` | **Contract:** [`../../../neurons/E4/credit--data--fetch-dosare.md`](../../../neurons/E4/credit--data--fetch-dosare.md). **Runtime (ADR-0001):** v2 declară `credit:data:fetch-dosare`, dar **nu** există intrare `QUEUES` dedicată; dosare instanță sunt acoperite operațional prin **`credit:data:fetch-bpi`** (C16) — vezi contract neuron și `E4_CREDIT_DATA_FETCH_BPI` în registry. |
| Destinație (graf) | `contract-template-select` | **Contract (neuron):** [`../../../neurons/E4/contract--template--select.md`](../../../neurons/E4/contract--template--select.md). **Traseu sinapse:** [`../contract-template-select/`](../contract-template-select/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-dosare** (în v2: neuron graf pentru date dosare) depinde în planificare de **selecția șablonului / clauzelor** (`contract-template-select`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie număr dosare sau coduri clauză.

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

- **Runtime (ADR-0001):** nod graf `credit-data-fetch-dosare` **nu** mapare 1:1 la o coadă dedicată în `queue-registry.ts` — reconciliere obligatorie prin `credit:data:fetch-bpi` (vezi contract sursă).
- **Semantic (ADR-0002):** catalog expune `e4:credit:data-fetch-bpi` pentru integrarea Termene care include dosare — vezi `cognitive-node-catalog.ts` în contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-dosare` → `contract-template-select`.

## Limite și reconcilieri

- Cititorul nu trebuie să assume că există worker separat „dosare-only”; dovada traseului executabil este în contractul **`credit--data--fetch-dosare.md`** și **`credit--data--fetch-bpi.md`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-dosare-contract-template-select\``.
