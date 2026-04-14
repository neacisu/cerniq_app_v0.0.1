# Sinapsă `contract-sign-complete-return-request-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-sign-complete-return-request-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-sign-complete/contract-sign-complete-return-request-create.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-sign-complete` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-sign-complete` | **Contract:** [`../../../neurons/E4/contract--sign--complete.md`](../../../neurons/E4/contract--sign--complete.md). |
| Destinație (graf) | `return-request-create` | **Contract:** [`../../../neurons/E4/return--request--create.md`](../../../neurons/E4/return--request--create.md). **Semantic (ADR-0002):** `e4:return:initiate`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **contract-sign-complete** depinde în planificare de **crearea cererii de retur**. v2: **„sinapsă canonică de pipeline”**; exportul nu specifică motivul returului.

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

- **Runtime (ADR-0001):** vezi contracte neuron.
- **Semantic (ADR-0002):** contracte ↔ logistică E4.
- **Planificare:** v2 §7 — `contract-sign-complete` → `return-request-create`.

## Limite și reconcilieri

- Fără completări despre condiții de business — doar structura grafului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-sign-complete-return-request-create\``.
