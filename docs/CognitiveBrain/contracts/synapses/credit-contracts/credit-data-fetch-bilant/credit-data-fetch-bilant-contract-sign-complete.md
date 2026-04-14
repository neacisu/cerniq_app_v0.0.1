# Sinapsă `credit-data-fetch-bilant-contract-sign-complete`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-bilant-contract-sign-complete` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-bilant/credit-data-fetch-bilant-contract-sign-complete.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-bilant` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-bilant` | **Contract:** [`../../../neurons/E4/credit--data--fetch-bilant.md`](../../../neurons/E4/credit--data--fetch-bilant.md). **Runtime (ADR-0001):** `credit:data:fetch-bilant` — `E4_CREDIT_DATA_FETCH_BILANT` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-sign-complete` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). **Traseu sinapse:** [`../contract-sign-complete/`](../contract-sign-complete/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-bilant** depinde în planificare de **finalizarea procesării contractului semnat** (`contract-sign-complete`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie PDF sau stări `gold_contracts`.

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
- **Semantic (ADR-0002):** E4 credit ↔ E4 semnătură completă.
- **Planificare:** v2 §7 — `credit-data-fetch-bilant` → `contract-sign-complete`.

## Limite și reconcilieri

- Persistența artefactelor semnate este în cod / contract neuron, nu în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-bilant-contract-sign-complete\``.
