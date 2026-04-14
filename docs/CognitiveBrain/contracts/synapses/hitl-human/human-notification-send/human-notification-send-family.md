# Sinapsă `human-notification-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-notification-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-notification-send/human-notification-send-family.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-notification-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `human-notification-send` | Traseu în graf; contract neuron: [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md). **Triplă autoritate:** v2 **`human:notification:send`**; la auditul din contract — **fără** literal în `queue-registry.ts` și **fără** `nodeKey` în catalog — vezi neuron. |
| Destinație (graf) | `e3-human` | Agregat **familie human E3** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e3/human.md`](../../../../adr/families/e3/human.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **human-notification-send** sub agregatul **`e3-human`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`human-notification-send-backup-conversations-export.md`](human-notification-send-backup-conversations-export.md), [`human-notification-send-metrics-llm-usage-aggregate.md`](human-notification-send-metrics-llm-usage-aggregate.md), [`human-notification-send-pipeline-ai-sales-cleanup.md`](human-notification-send-pipeline-ai-sales-cleanup.md), [`human-notification-send-pipeline-ai-sales-health.md`](human-notification-send-pipeline-ai-sales-health.md), [`human-notification-send-pipeline-ai-sales-metrics.md`](human-notification-send-pipeline-ai-sales-metrics.md), [`human-notification-send-report-conversion-analyze.md`](human-notification-send-report-conversion-analyze.md), [`human-notification-send-report-daily-generate.md`](human-notification-send-report-daily-generate.md).

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

- **Runtime (ADR-0001):** `e3-human` nu este cheie în `QUEUES`; pentru **`human:notification:send`** — **gap** documentat în contractul neuron; cozi **`human:*`** E3 din registry sunt **alte nume** — vezi același fișier.
- **Semantic (ADR-0002):** **fără** `nodeKey` catalog pentru acest `v2_queue` la auditul din contract.
- **Planificare:** v2 §7 — `human-notification-send` → `e3-human`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Muchiile `dependency` către neuroni **ops** (backup, metrics, pipeline, rapoarte) sunt **topologie planificată**; capetele de destinație au în majoritate **gap runtime** — vezi contractele E3 din folderul `neurons/E3/`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-notification-send-family\``.
