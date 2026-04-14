# Sinapsă `credit-check-order-contract-generate-docx`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-check-order-contract-generate-docx` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-check-order/credit-check-order-contract-generate-docx.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-check-order` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-check-order` | **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |
| Destinație (graf) | `contract-generate-docx` | **Contract:** [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Semantic (ADR-0002):** `e4:contract:generate` (vezi neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-check-order** depinde în planificare de **generarea fișierului DOCX contract** — legătură între eligibilitatea de credit și artefactul contractual. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie șabloane sau merge fields.

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
- **Semantic (ADR-0002):** E4 credit ↔ E4 generare contract.
- **Planificare:** v2 §7 — `credit-check-order` → `contract-generate-docx`.

## Limite și reconcilieri

- Fără presupuneri despre ordinea reală față de alți pași G33–G36 — doar structura v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-check-order-contract-generate-docx\``.
