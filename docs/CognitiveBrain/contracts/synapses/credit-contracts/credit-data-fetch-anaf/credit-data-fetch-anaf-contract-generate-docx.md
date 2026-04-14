# Sinapsă `credit-data-fetch-anaf-contract-generate-docx`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `credit-data-fetch-anaf-contract-generate-docx` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/credit-data-fetch-anaf/credit-data-fetch-anaf-contract-generate-docx.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `credit-data-fetch-anaf` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `credit-data-fetch-anaf` | **Contract:** [`../../../neurons/E4/credit--data--fetch-anaf.md`](../../../neurons/E4/credit--data--fetch-anaf.md). **Runtime (ADR-0001):** `credit:data:fetch-anaf` — `E4_CREDIT_DATA_FETCH_ANAF` în `workers/shared/src/queue-registry.ts`. |
| Destinație (graf) | `contract-generate-docx` | **Contract (neuron):** [`../../../neurons/E4/contract--generate--docx.md`](../../../neurons/E4/contract--generate--docx.md). **Traseu sinapse:** [`../contract-generate-docx/`](../contract-generate-docx/). **Runtime:** vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **credit-data-fetch-anaf** depinde în planificare de **generarea fișierului DOCX contract** — legătură între datele fiscale folosite în scoring și artefactul contractual. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie șabloane sau merge fields.

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
- **Semantic (ADR-0002):** E4 credit ↔ E4 generare DOCX — vezi catalog în contracte.
- **Planificare:** v2 §7 — `credit-data-fetch-anaf` → `contract-generate-docx`.

## Limite și reconcilieri

- Detaliile `contract:generate` vs etichete graf sunt în contractul neuron destinație, nu în sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`credit-data-fetch-anaf-contract-generate-docx\``.
