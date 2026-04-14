# Sinapsă `credit-release-order-contract-generate-docx`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-release-order-contract-generate-docx` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-release-order/credit-release-order-contract-generate-docx.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-release-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-release-order` | **Contract:** [`../../../neurons/E4/credit--release--order.md`](../../../neurons/E4/credit--release--order.md). **Runtime (ADR-0001):** `credit:limit:release` — `E4_CREDIT_LIMIT_RELEASE` (v2: `credit:release:order`). |
| Destinație (graf) | `contract-generate-docx` | **Contract (neuron):** [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Traseu sinapse:** [`../contract-generate-docx/`](../contract-generate-docx/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-release-order** depinde în planificare de **generarea DOCX** pentru contract. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie artefacte sau șabloane.

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

- **Runtime (ADR-0001):** vezi contracte neuron sursă și țintă.
- **Semantic (ADR-0002):** credit E4 ↔ generare document E4.
- **Planificare:** v2 §7 — `credit-release-order` → `contract-generate-docx`.

## Limite și reconcilieri

- Detaliile DOCX nu sunt în exportul sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-release-order-contract-generate-docx\``.
