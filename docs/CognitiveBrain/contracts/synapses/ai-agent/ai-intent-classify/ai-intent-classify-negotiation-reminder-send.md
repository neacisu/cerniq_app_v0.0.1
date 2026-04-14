# Sinapsă `ai-intent-classify-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-intent-classify-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-intent-classify/ai-intent-classify-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-intent-classify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-intent-classify` | **Execuție (ADR-0001):** **`intent:classify`** (`QUEUES.E3_INTENT_CLASSIFY`). **v2 / catalog:** **`ai:intent:classify`** — șirul literal `ai:intent:classify` nu este nume de coadă în `queue-registry.ts`; K62 în `e3-ai-sales`. Reconciliere: [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). |
| Destinatie (graf) | `negotiation-reminder-send` | Coadă canonică **`negotiation:reminder:send`** — [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). |

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

- **Runtime:** sursă: `QUEUES.E3_INTENT_CLASSIFY` → `intent:classify`; țintă: `QUEUES.E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send` (`workers/shared/src/queue-registry.ts`). Matrice + contracte: [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv), [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md), [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md).
- **Semantic:** `nodeKey` / swimlane — `cognitive-node-catalog.ts` + contractele neuron.
- **Planificare:** muchie **`dependency`**: în graful exportat, `ai-intent-classify` precede `negotiation-reminder-send`; v2 confirmă doar „sinapsă canonică de pipeline”, fără semantica operațională suplimentară în registru.

## Limite și reconcilieri

- Slug sursă ↔ execuție **`intent:classify`**. Slug `negotiation-reminder-send` ↔ **`negotiation:reminder:send`**. Fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-intent-classify-negotiation-reminder-send\``.
