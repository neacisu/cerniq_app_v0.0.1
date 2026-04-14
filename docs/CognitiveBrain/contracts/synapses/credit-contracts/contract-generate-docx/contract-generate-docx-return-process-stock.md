# Sinapsă `contract-generate-docx-return-process-stock`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-docx-return-process-stock` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-docx/contract-generate-docx-return-process-stock.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-docx` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-generate-docx` | **Contract:** [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Runtime:** `contract:generate` (graf v2 `contract:generate:docx`). **Semantic:** `e4:contract:generate`. |
| Destinație (graf) | `return-process-stock` | **Contract:** [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **contract-generate-docx** depinde canonic de **`return-process-stock`**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie ordinea între generarea contractului și procesarea returului pe stoc.

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

- **Runtime (ADR-0001):** sursa — `contract:generate`; ținta — vezi neuron retur.
- **Semantic (ADR-0002):** E4 generare contract → E4 retur/logistică.
- **Planificare:** `contract-generate-docx` → `return-process-stock`.

## Limite și reconcilieri

- Dependența este structurală în v2; execuția — audit cod.
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-docx-return-process-stock\``.
