# Sinapsă `guardrail-log-analyze-document-template-compile`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-document-template-compile` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-document-template-compile.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** vezi contractul neuron. |
| Destinație (graf) | `document-template-compile` | **Matrix:** `document:template:compile` → [`../../../neurons/E3/document--template--compile.md`](../../../neurons/E3/document--template--compile.md). **Registry:** `document:template:compile`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară că **`document-template-compile`** este canonic legat de **`guardrail-log-analyze`**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre șabloane sau ordine. Sursa este sub semnul întrebării operaționale conform contractului neuron; ținta are coadă în registry.

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

- **Runtime (ADR-0001):** `E3_DOCUMENT_TEMPLATE_COMPILE` pentru destinație. Sursa: vezi gap.
- **Semantic (ADR-0002):** `e3:document:template-compile`.
- **Planificare:** dependență guardrail-log-analyze → compilare șablon.

## Limite și reconcilieri

- Export-grounded; fără completări inventate despre fluxul real.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-document-template-compile\``.
