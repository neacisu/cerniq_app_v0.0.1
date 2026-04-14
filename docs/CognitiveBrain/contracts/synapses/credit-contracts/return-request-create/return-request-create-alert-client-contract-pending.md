# Sinapsă `return-request-create-alert-client-contract-pending`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `return-request-create-alert-client-contract-pending` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/return-request-create/return-request-create-alert-client-contract-pending.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `return-request-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `return-request-create` | **Contract:** [`../../../neurons/E4/return--request--create.md`](../../../neurons/E4/return--request--create.md). **Runtime (ADR-0001):** vezi neuron — mapare v2 `return:request:create` ↔ **`return:initiate`**. |
| Destinație (graf) | `alert-client-contract-pending` | **Contract:** [`../../../neurons/E4/alert--client--contract-pending.md`](../../../neurons/E4/alert--client--contract-pending.md). Alerte granulare v2 vs cozi generice `alert:*`: vezi neuron țintă. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **return-request-create** are dependență sintactică față de nodul **alert-client-contract-pending**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie canal, conținut mesaj sau prioritate.

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

- **Planificare:** v2 §7 — `return-request-create` → `alert-client-contract-pending`.
- **Runtime (ADR-0001):** cozi distincte / generice — vezi ambele contracte neuron.
- **Semantic (ADR-0002):** vezi intrările din catalog pentru inițiere retur și alerte E4, în limitele din neuroni.

## Limite și reconcilieri

- Nume nod în graf vs **implementare** alertă: **necesită reconciliere graf ↔ registry** — vezi [`alert--client--contract-pending.md`](../../../neurons/E4/alert--client--contract-pending.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`return-request-create-alert-client-contract-pending\``.
