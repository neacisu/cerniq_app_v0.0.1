# Sinapsă `credit-data-fetch-bilant-contract-sign-request`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-bilant-contract-sign-request` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-bilant/credit-data-fetch-bilant-contract-sign-request.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-bilant` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-bilant` | **Contract:** [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). **Runtime (ADR-0001):** `credit:data:fetch-bilant` — `E4_CREDIT_DATA_FETCH_BILANT` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-sign-request` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--request.md`](../../../neurons/E4/contract--sign--request.md). **Traseu sinapse:** [`../contract-sign-request/`](../contract-sign-request/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-bilant** depinde în planificare de **cererea de semnare DocuSign** (`contract-sign-request`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie envelope sau semnatari.

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

- **Runtime (ADR-0001):** vezi contracte neuron sursă și destinație.
- **Semantic (ADR-0002):** E4 credit ↔ E4 semnătură cerere.
- **Planificare:** v2 §7 — `credit-data-fetch-bilant` → `contract-sign-request`.

## Limite și reconcilieri

- Integrarea DocuSign și identitățile semnatarilor sunt în contractul neuron destinație, nu în registrul sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-bilant-contract-sign-request\``.
