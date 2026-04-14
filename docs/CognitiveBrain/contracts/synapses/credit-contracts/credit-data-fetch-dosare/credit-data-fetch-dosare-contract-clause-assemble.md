# Sinapsă `credit-data-fetch-dosare-contract-clause-assemble`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-dosare-contract-clause-assemble` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-dosare/credit-data-fetch-dosare-contract-clause-assemble.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-dosare` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-dosare` | **Contract:** [`../../../neurons/E4/credit--data--fetch-dosare.md`](../../../neurons/E4/credit--data--fetch-dosare.md). **Runtime (ADR-0001):** v2 `credit:data:fetch-dosare` fără `QUEUES` dedicat; execuție prin **`credit:data:fetch-bpi`** (C16) — vezi contract. |
| Destinație (graf) | `contract-clause-assemble` | **Contract (neuron):** [`../../../neurons/E4/contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md). **Traseu sinapse:** [`../contract-clause-assemble/`](../contract-clause-assemble/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-dosare** depinde în planificare de **asamblarea clauzelor contract** — cuplare între informațiile judiciare planificate în graf și construcția contractului. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie seturi de clauze sau conținut dosare.

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

- **Runtime (ADR-0001):** reconciliere graf ↔ `credit:data:fetch-bpi` — vezi contract sursă.
- **Semantic (ADR-0002):** planificare dosare (graf) ↔ E4 contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-dosare` → `contract-clause-assemble`.

## Limite și reconcilieri

- Nu se inferă din sinapsă ordinea strictă operațională între încărcarea dosarelor și asamblare — doar dependența din exportul de graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-dosare-contract-clause-assemble\``.
