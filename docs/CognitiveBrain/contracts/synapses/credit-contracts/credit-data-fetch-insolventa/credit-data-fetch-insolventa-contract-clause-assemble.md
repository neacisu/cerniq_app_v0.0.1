# Sinapsă `credit-data-fetch-insolventa-contract-clause-assemble`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-insolventa-contract-clause-assemble` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-insolventa/credit-data-fetch-insolventa-contract-clause-assemble.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-insolventa` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-insolventa` | **Contract:** [`../../../neurons/E4/credit--data--fetch-insolventa.md`](../../../neurons/E4/credit--data--fetch-insolventa.md). **Runtime (ADR-0001):** fără coadă dedicată; acoperire parțială prin **`credit:data:fetch-bpi`** — vezi contract. |
| Destinație (graf) | `contract-clause-assemble` | **Contract (neuron):** [`../../../neurons/E4/contract--clause--assemble.md`](../../../neurons/E4/contract--clause--assemble.md). **Traseu sinapse:** [`../contract-clause-assemble/`](../contract-clause-assemble/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-insolventa** depinde în planificare de **asamblarea clauzelor contract** — cuplare între riscul de insolvență modelat în graf și construcția contractului. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie seturi de clauze sau structura procedurilor.

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

- **Runtime (ADR-0001):** reconciliere graf ↔ BPI — vezi contract sursă.
- **Semantic (ADR-0002):** planificare insolvență (graf) ↔ E4 contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-insolventa` → `contract-clause-assemble`.

## Limite și reconcilieri

- Nu se inferă din sinapsă ordinea strictă operațională între încărcarea datelor și asamblare — doar dependența din exportul de graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-insolventa-contract-clause-assemble\``.
