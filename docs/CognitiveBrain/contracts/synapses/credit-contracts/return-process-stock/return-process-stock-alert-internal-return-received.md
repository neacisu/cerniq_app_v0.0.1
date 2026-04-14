# Sinapsă `return-process-stock-alert-internal-return-received`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `return-process-stock-alert-internal-return-received` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/return-process-stock/return-process-stock-alert-internal-return-received.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `return-process-stock` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `return-process-stock` | **Contract:** [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Runtime (ADR-0001):** vezi neuron — mapare v2 `return:process:stock` ↔ coadă implementată. |
| Destinație (graf) | `alert-internal-return-received` | **Contract:** [`../../../neurons/E4/alert--internal--return-received.md`](../../../neurons/E4/alert--internal--return-received.md). Alerte granulare v2 vs cozi generice `alert:*`: vezi neuron destinație. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **return-process-stock** are dependență sintactică față de nodul **alert-internal-return-received**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie canal, conținut mesaj sau prioritate.

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

- **Planificare:** v2 §7 — `return-process-stock` → `alert-internal-return-received`.
- **Runtime (ADR-0001):** cozi distincte / generice — vezi ambele contracte neuron.
- **Semantic (ADR-0002):** vezi intrările din catalog pentru procesare retur și alerte E4, în limitele din neuroni.

## Limite și reconcilieri

- Nume nod în graf vs **implementare** alertă: **necesită reconciliere graf ↔ registry** — vezi [`alert--internal--return-received.md`](../../../neurons/E4/alert--internal--return-received.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`return-process-stock-alert-internal-return-received\``.
