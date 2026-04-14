# Sinapsă `guardrail-log-analyze-document-pdf-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-document-pdf-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-document-pdf-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap registry:** vezi contractul neuron (lipsă `QUEUES` / handler la audit). |
| Destinație (graf) | `document-pdf-generate` | **Matrix:** `document:pdf:generate` → [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). **Registry:** `document:pdf:generate`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`document-pdf-generate`** de **`guardrail-log-analyze`** în planificare. v2: **„sinapsă canonică de pipeline”**. Legătura operațională între analiza logurilor (neuron sursă cu gap documentat) și generarea PDF rămâne **de reconciliat** în implementare; muchia reflectă doar exportul de graf.

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

- **Runtime (ADR-0001):** ținta `E3_DOCUMENT_PDF_GENERATE`. Sursa: fără coadă canonică confirmată în registry la contractul neuron.
- **Semantic (ADR-0002):** `e3:document:pdf-generate`; sursă — gap catalog (contract neuron).
- **Planificare:** dependență declarată în graf.

## Limite și reconcilieri

- Nu presupune că `guardrail:log:analyze` rulează ca job BullMQ doar pentru că ținta există în registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-document-pdf-generate\``.
