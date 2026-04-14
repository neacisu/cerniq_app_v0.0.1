# Sinapsă `credit-release-order-contract-sign-request`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-release-order-contract-sign-request` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-release-order/credit-release-order-contract-sign-request.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-release-order` | **Contract:** [`../../../neurons/E4/credit--release--order.md`](../../../neurons/E4/credit--release--order.md). **Runtime (ADR-0001):** `credit:limit:release` — `E4_CREDIT_LIMIT_RELEASE` (v2: `credit:release:order`). |
| Destinație (graf) | `contract-sign-request` | **Contract (neuron):** [`../../../neurons/E4/contract--sign--request.md`](../../../neurons/E4/contract--sign--request.md). **Traseu sinapse:** [`../contract-sign-request/`](../contract-sign-request/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-release-order** depinde în planificare de **cererea de semnare** a contractului. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie furnizor sau flux HITL.

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
- **Semantic (ADR-0002):** credit E4 ↔ semnătură E4.
- **Planificare:** v2 §7 — `credit-release-order` → `contract-sign-request`.

## Limite și reconcilieri

- Detaliile semnăturii sunt în contractul neuron destinație, nu în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-release-order-contract-sign-request\``.
