# Sinapsă `ai-feedback-collect-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-feedback-collect-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-feedback-collect/ai-feedback-collect-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-feedback-collect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-feedback-collect` | **Execuție:** coadă **`feedback:collect`** (`QUEUES.E3_FEEDBACK_COLLECT`). Slug graf / câmpuri v2: `ai-feedback-collect` / `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). |
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

- **Runtime:** sursă și destinație sunt aliniabile la rândurile din [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) pentru `feedback:collect` / `ai:feedback:collect` (documentare) și `negotiation:reminder:send`; confirmare cozi în `workers/shared/src/queue-registry.ts` (`E3_FEEDBACK_COLLECT`, `E3_NEGOTIATION_REMINDER_SEND`).
- **Semantic:** `nodeKey` / swimlane — din `cognitive-node-catalog.ts` și contractele neuron de mai sus.
- **Planificare:** muchie **`dependency`**: în topologia exportată, `ai-feedback-collect` precede `negotiation-reminder-send`. v2 nu precizează conținut mesaj sau declanșatori dincolo de registru.

## Limite și reconcilieri

- Slug-uri graf vs cozi: `ai-feedback-collect` ↔ **`feedback:collect`**; `negotiation-reminder-send` ↔ **`negotiation:reminder:send`**. Fără presupuneri despre payload.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-feedback-collect-negotiation-reminder-send\``.
