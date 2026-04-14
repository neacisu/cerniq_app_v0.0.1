# Sinapsă `contract-sign-request-return-process-stock`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-request-return-process-stock` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-request/contract-sign-request-return-process-stock.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-request` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-request` | **Contract:** [`../../../neurons/E4/contract--sign--request.md`](../../../neurons/E4/contract--sign--request.md). **Runtime:** vezi contract — graf vs `contract:docusign:send`. |
| Destinație (graf) | `return-process-stock` | **Contract:** [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Semantic (ADR-0002):** `e4:return:process`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **cerere semnare contract (DocuSign)** depinde în planificare de **procesarea returului în stoc** — dependență structurală între contracte și logistică. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie detalii retur.

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

- **Runtime (ADR-0001):** cozi — contracte neuron sursă și țintă.
- **Semantic (ADR-0002):** E4 `contracts` ↔ E4 `logistics`.
- **Planificare:** v2 §7 — `contract-sign-request` → `return-process-stock`.

## Limite și reconcilieri

- Ordinea cauzală în runtime **nu** rezultă din câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-request-return-process-stock\``.
