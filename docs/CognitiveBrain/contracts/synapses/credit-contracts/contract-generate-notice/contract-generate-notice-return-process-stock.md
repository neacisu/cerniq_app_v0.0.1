# Sinapsă `contract-generate-notice-return-process-stock`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-notice-return-process-stock` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-notice/contract-generate-notice-return-process-stock.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-notice` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-generate-notice` | **Contract:** [`../../../neurons/E4/contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md). **v2:** `contract:generate:notice`. **Runtime / catalog:** gap documentat la neuron — **nu** afirma coadă sau `nodeKey` fără reconciliere. |
| Destinație (graf) | `return-process-stock` | **Contract:** [`../../../neurons/E4/return--process--stock.md`](../../../neurons/E4/return--process--stock.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **contract-generate-notice** depinde canonic de **`return-process-stock`**. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie execuția sursei sau ordinea față de retur.

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

- **Runtime (ADR-0001):** sursa — vezi limită neuron; ținta — vezi [`return--process--stock.md`](../../../neurons/E4/return--process--stock.md).
- **Semantic (ADR-0002):** traseu contracts (graf) → E4 retur.
- **Planificare:** `contract-generate-notice` → `return-process-stock`.

## Limite și reconcilieri

- Muchia este **structurală** în v2; implementarea sursei **nu** este dovedită din sinapsă — vezi [`contract--generate--notice.md`](../../../neurons/E4/contract--generate--notice.md).
- Fără completări fictive pentru payload sau retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-notice-return-process-stock\``.
