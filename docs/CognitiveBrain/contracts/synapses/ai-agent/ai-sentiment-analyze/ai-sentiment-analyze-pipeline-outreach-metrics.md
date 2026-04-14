# Sinapsă `ai-sentiment-analyze-pipeline-outreach-metrics`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-sentiment-analyze-pipeline-outreach-metrics` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-sentiment-analyze/ai-sentiment-analyze-pipeline-outreach-metrics.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-sentiment-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-sentiment-analyze` | Coadă executabilă **`ai:sentiment:analyze`** (`QUEUES.AI_SENTIMENT_ANALYZE`, `workers/shared/src/queue-registry.ts`) — [`../../../neurons/E2/ai--sentiment--analyze.md`](../../../neurons/E2/ai--sentiment--analyze.md). |
| Țintă | `pipeline-outreach-metrics` | Coadă executabilă **`pipeline:outreach:metrics`** (`QUEUES.PIPELINE_OUTREACH_METRICS`) — [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graf, agregarea metricilor outreach este dependentă de traseul `ai-sentiment-analyze`. Registrul §7 nu specifică schema metricilor sau legătura de date între workeri.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `AI_SENTIMENT_ANALYZE`; `PIPELINE_OUTREACH_METRICS`.
- **Semantic (ADR-0002):** `e2:ai:sentiment-analyze`; `e2:pipeline:outreach-metrics` / `pipeline:outreach:metrics` — „Colectare și agregare metrici outreach” (~L1472–1480).
- **Planificare:** v2 §7 — `ai-sentiment-analyze` → `pipeline-outreach-metrics`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Slug graf vs cozi; comportament detaliat în contractele neuron și workeri, nu dedus din această muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-sentiment-analyze-pipeline-outreach-metrics\``.
