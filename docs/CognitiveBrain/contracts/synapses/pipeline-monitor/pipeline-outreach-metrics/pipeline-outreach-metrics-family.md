# Sinapsă `pipeline-outreach-metrics-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pipeline-outreach-metrics-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/pipeline-outreach-metrics/pipeline-outreach-metrics-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `pipeline-outreach-metrics` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `pipeline-outreach-metrics` | Traseu în graf; contract neuron: [`../../../neurons/E2/pipeline--outreach--metrics.md`](../../../neurons/E2/pipeline--outreach--metrics.md). **Triplă autoritate:** v2 **`pipeline:outreach:metrics`**; runtime canonic **`e2:pipeline:outreach-metrics`** (`QUEUES.PIPELINE_OUTREACH_METRICS`) — vezi neuron și registry în contractul neuron. |
| Destinație (graf) | `e2-monitoring` | Agregat **familie monitoring E2** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e2/monitoring.md`](../../../../adr/families/e2/monitoring.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **pipeline-outreach-metrics** sub agregatul **`e2-monitoring`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`pipeline-outreach-metrics-human-approve-message.md`](pipeline-outreach-metrics-human-approve-message.md), [`pipeline-outreach-metrics-human-review-queue.md`](pipeline-outreach-metrics-human-review-queue.md), [`pipeline-outreach-metrics-human-takeover-complete.md`](pipeline-outreach-metrics-human-takeover-complete.md), [`pipeline-outreach-metrics-human-takeover-initiate.md`](pipeline-outreach-metrics-human-takeover-initiate.md).

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

- **Planificare:** v2 §7 — `pipeline-outreach-metrics` → `e2-monitoring`.
- **Semantic (ADR-0002):** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `pipeline:outreach:metrics`, rând **88**; `nodeKey` **`e2:pipeline:outreach-metrics`**.
- **Runtime (ADR-0001):** coadă **`pipeline:outreach:metrics`** — vezi `queue-registry.ts` în contractul neuron.

## Limite și reconcilieri

- **`e2-monitoring`** este etichetă de familie în graf, nu **`e2:pipeline:outreach-metrics`**; reconcilierea este prin ADR familie și neuron, nu prin egalare de string între graf și registry.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pipeline-outreach-metrics-family\``.
