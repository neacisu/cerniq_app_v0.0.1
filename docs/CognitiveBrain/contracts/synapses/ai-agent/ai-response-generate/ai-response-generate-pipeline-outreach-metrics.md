# Sinapsă `ai-response-generate-pipeline-outreach-metrics`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-response-generate-pipeline-outreach-metrics` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-response-generate/ai-response-generate-pipeline-outreach-metrics.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-response-generate` | **Planificare:** traseu `ai-response-generate`. **Contract sursă:** [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). |
| Țintă | `pipeline-outreach-metrics` | **Matrix:** `pipeline:outreach:metrics` (E2, `monitoring`) → [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). **Registry:** `PIPELINE_OUTREACH_METRICS` → `pipeline:outreach:metrics`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în planificare că **`pipeline-outreach-metrics`** este legat canonic de traseul **`ai-response-generate`**. v2 redă **„sinapsă canonică de pipeline”**; nu enumeră metrici, dimensiuni sau surse de date. Agregarea metricilor în outreach este documentată în contractul E2 țintă; muchia rămâne **dovadă de topologie exportată**, nu schemă de evenimente.

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

- **Runtime (ADR-0001):** ținta **`pipeline:outreach:metrics`**. Sursa: vezi [`ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md) pentru numele efective de coadă.
- **Semantic (ADR-0002):** catalog + contracte pentru `e2:pipeline:outreach-metrics` și pentru `e3:ai:response-generate` / `e2:ai:response-generate`.
- **Planificare:** dependență între generarea răspunsului și colectarea/agregarea metricilor pipeline outreach.

## Limite și reconcilieri

- Fără presupuneri despre payload muchie sau despre frecvența joburilor de metrici.
- Sursă pe două cozi posibile: interpretarea „fluxului real” cere audit de cod, nu doar graful.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-response-generate-pipeline-outreach-metrics\``.
