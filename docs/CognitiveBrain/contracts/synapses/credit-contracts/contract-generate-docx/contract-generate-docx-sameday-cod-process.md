# Sinapsă `contract-generate-docx-sameday-cod-process`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `contract-generate-docx-sameday-cod-process` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/contract-generate-docx/contract-generate-docx-sameday-cod-process.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `contract-generate-docx` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `contract-generate-docx` | **Contract:** [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Runtime:** `contract:generate`. **Semantic:** `e4:contract:generate`. |
| Destinație (graf) | `sameday-cod-process` | **Contract:** [`../../../neurons/E4/sameday--cod--process.md`](../../../neurons/E4/sameday--cod--process.md). **Runtime / catalog:** vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: **contract-generate-docx** → **`sameday-cod-process`**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** vezi contracte sursă și destinație.
- **Semantic (ADR-0002):** E4 generare → E4 SameDay COD.
- **Planificare:** `contract-generate-docx` → `sameday-cod-process`.

## Limite și reconcilieri

- Fără presupuneri despre payload sau retry din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`contract-generate-docx-sameday-cod-process\``.
