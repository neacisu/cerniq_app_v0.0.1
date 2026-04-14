# Sinapsă `human-queue-prioritize-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-queue-prioritize-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-queue-prioritize/human-queue-prioritize-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-queue-prioritize` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `human-queue-prioritize` | Traseu în graf; contract neuron: [`../../../neurons/E3/human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md). **Triplă autoritate:** v2 **`human:queue:prioritize`**; la auditul din contract — **fără** literal în `queue-registry.ts` și **fără** `nodeKey` în catalog — vezi neuron. |
| Destinație (graf) | `e3-human` | Agregat **familie human E3** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e3/human.md`](../../../../adr/families/e3/human.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **human-queue-prioritize** sub agregatul **`e3-human`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`human-queue-prioritize-backup-conversations-export.md`](human-queue-prioritize-backup-conversations-export.md), [`human-queue-prioritize-metrics-llm-usage-aggregate.md`](human-queue-prioritize-metrics-llm-usage-aggregate.md), [`human-queue-prioritize-pipeline-ai-sales-cleanup.md`](human-queue-prioritize-pipeline-ai-sales-cleanup.md), [`human-queue-prioritize-pipeline-ai-sales-health.md`](human-queue-prioritize-pipeline-ai-sales-health.md), [`human-queue-prioritize-pipeline-ai-sales-metrics.md`](human-queue-prioritize-pipeline-ai-sales-metrics.md), [`human-queue-prioritize-report-conversion-analyze.md`](human-queue-prioritize-report-conversion-analyze.md), [`human-queue-prioritize-report-daily-generate.md`](human-queue-prioritize-report-daily-generate.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e3-human` nu este cheie în `QUEUES`; pentru **`human:queue:prioritize`** — **gap** documentat în contractul neuron.
- **Semantic (ADR-0002):** **fără** `nodeKey` catalog pentru acest `v2_queue` la auditul din contract.
- **Planificare:** v2 §7 — `human-queue-prioritize` → `e3-human`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Posibilă **similitudine semantică** cu `human:escalate` (N76) — **nu** echivalență demonstrată strict pe numele cozii; vezi [`human--queue--prioritize.md`](../../../neurons/E3/human--queue--prioritize.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-queue-prioritize-family\``.
