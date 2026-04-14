# Sinapsă `ai-intent-classify-pipeline-outreach-health`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-intent-classify-pipeline-outreach-health` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-intent-classify/ai-intent-classify-pipeline-outreach-health.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-intent-classify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-intent-classify` | **Execuție (ADR-0001):** **`intent:classify`** (`QUEUES.E3_INTENT_CLASSIFY`). **v2 / catalog:** **`ai:intent:classify`** — șirul literal `ai:intent:classify` nu este nume de coadă în `queue-registry.ts`; K62 în `e3-ai-sales`. Reconciliere: [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). |
| Destinatie (graf) | `pipeline-outreach-health` | Coadă canonică **`pipeline:outreach:health`** — [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime:** sursă: `QUEUES.E3_INTENT_CLASSIFY` → `intent:classify`; destinație: `QUEUES.PIPELINE_OUTREACH_HEALTH` → `pipeline:outreach:health` (`workers/shared/src/queue-registry.ts`). Matrice + contracte: [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv), [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md), [`../../../neurons/E2/pipeline--outreach--health.md`](../../../neurons/E2/pipeline--outreach--health.md).
- **Semantic:** `nodeKey` / swimlane — `cognitive-node-catalog.ts` + contractele neuron.
- **Planificare:** muchie **`dependency`**: în graful exportat, `ai-intent-classify` precede `pipeline-outreach-health`; v2 confirmă doar „sinapsă canonică de pipeline”, fără semantica operațională suplimentară în registru.

## Limite și reconcilieri

- Slug sursă ↔ execuție **`intent:classify`**. Slug `pipeline-outreach-health` ↔ **`pipeline:outreach:health`**. Fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-intent-classify-pipeline-outreach-health\``.
