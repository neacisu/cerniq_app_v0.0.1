# Sinapsă `contract-sign-request-sameday-awb-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-request-sameday-awb-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-request/contract-sign-request-sameday-awb-create.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-request` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-request` | **Contract:** [`../../../neurons/E4/contract--sign--request.md`](../../../neurons/E4/contract--sign--request.md). |
| Destinație (graf) | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Semantic (ADR-0002):** `e4:sameday:awb-create`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-request** depinde în planificare de **crearea AWB Sameday**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie detalii expediere.

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

- **Runtime (ADR-0001):** vezi contract neuron destinație.
- **Semantic (ADR-0002):** E4 logistică.
- **Planificare:** v2 §7 — `contract-sign-request` → `sameday-awb-create`.

## Limite și reconcilieri

- Fără presupuneri despre legătura temporală cu trimiterea DocuSign — doar dependența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-request-sameday-awb-create\``.
