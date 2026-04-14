# Sinapsă `guardrail-discount-check-document-template-compile`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-document-template-compile` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-document-template-compile.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `document-template-compile` | **Matrix:** `document:template:compile` → [`../../../neurons/E3/document--template--compile.md`](../../../neurons/E3/document--template--compile.md). **Registry:** `E3_DOCUMENT_TEMPLATE_COMPILE` → `document:template:compile`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară că **`document-template-compile`** este canonic legat de **`guardrail-discount-check`**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre șabloane, variabile sau condiții de blocare. Implementarea compilării șablonului este în contractul neuron destinație.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `document:template:compile`.
- **Semantic (ADR-0002):** `e3:document:template-compile` și intrare guardrail discount — vezi catalog.
- **Planificare:** dependență guardrail → compilare șablon document.

## Limite și reconcilieri

- Reconciliere slug graf vs cozi obligatorie; fără presupuneri despre conținut job.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-document-template-compile\``.
