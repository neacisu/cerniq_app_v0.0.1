# Sinapsă `ai-feedback-collect-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-feedback-collect-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-feedback-collect/ai-feedback-collect-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-feedback-collect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-feedback-collect` | **Execuție:** coadă **`feedback:collect`** (`QUEUES.E3_FEEDBACK_COLLECT`). Slug graf / câmpuri v2: `ai-feedback-collect` / `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). |
| Destinatie (graf) | `negotiation-expire-check` | Coadă canonică **`negotiation:expire:check`** — [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). |

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

- **Runtime:** sursă și destinatie (nod) de mai sus sunt aliniabile la perechi `(etapă, coadă)` din [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic:** `nodeKey` / swimlane pentru ambele capete — din `cognitive-node-catalog.ts` și contractele neuron.
- **Planificare:** muchie **`dependency`**: în topologia exportată, fluxul etichetat `ai-feedback-collect` precede `negotiation-expire-check`. v2 nu encodează payload sau semantica operațională dincolo de descrierea canonică de pipeline.

## Limite și reconcilieri

- Slug-uri graf vs cozi: `ai-feedback-collect` ↔ **`feedback:collect`** (sursă); `negotiation-expire-check` ↔ **`negotiation:expire:check`** (destinație). Fără presupuneri despre payload acolo unde exportul nu îl definește.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-feedback-collect-negotiation-expire-check\``.
