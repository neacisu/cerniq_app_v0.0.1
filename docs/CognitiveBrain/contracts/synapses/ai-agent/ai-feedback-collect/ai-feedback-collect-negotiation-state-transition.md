# Sinapsă `ai-feedback-collect-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-feedback-collect-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-feedback-collect/ai-feedback-collect-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-feedback-collect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-feedback-collect` | **Execuție:** coadă **`feedback:collect`** (`QUEUES.E3_FEEDBACK_COLLECT`). Slug graf / câmpuri v2: `ai-feedback-collect` / `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). |
| Destinatie (graf) | `negotiation-state-transition` | Coadă canonică **`negotiation:state:transition`** — [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). |

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

- **Runtime:** sursă și țintă aliniabile la [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) și la `workers/shared/src/queue-registry.ts` (`E3_FEEDBACK_COLLECT`, `E3_NEGOTIATION_STATE_TRANSITION`).
- **Semantic:** `nodeKey` / swimlane — din `cognitive-node-catalog.ts` și contractele neuron.
- **Planificare:** muchie **`dependency`**: în graful exportat, `ai-feedback-collect` precede `negotiation-state-transition`. Fără afirmații despre automatul de stări din export.

## Limite și reconcilieri

- Slug-uri graf vs cozi: `ai-feedback-collect` ↔ **`feedback:collect`**; `negotiation-state-transition` ↔ **`negotiation:state:transition`**. Fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-feedback-collect-negotiation-state-transition\``.
