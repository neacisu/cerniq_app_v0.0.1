# Sinapsă `ai-agent-orchestrate-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-orchestrate-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-orchestrate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-agent-orchestrate` | Coadă canonică **`ai:agent:orchestrate`** — [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). |
| Destinație (graf) | `negotiation-reminder-send` | Coadă canonică **`negotiation:reminder:send`** — [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Muchia **`dependency`** plasează `ai-agent-orchestrate` înaintea `negotiation-reminder-send` în topologia planificată: proiectarea cere ca orchestrarea agentului să preceadă (în sens de dependență de graf) pasul de trimitere a memento-urilor de negociere. Registrul §7 nu specifică payload, retry sau legătura directă între procesorul cozii sursă și producătorul cozii destinație.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** `QUEUES.E3_AI_AGENT_ORCHESTRATE` → `ai:agent:orchestrate`; `QUEUES.E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e3:ai:agent-orchestrate` — orchestrare agent (ExecutiveNeuron, `ai-reasoning`); `e3:negotiation:reminder-send` / `negotiation:reminder:send` — „Trimitere reminder automat la lead pentru negocieri în așteptare” (MotorNeuron, `negotiation-fsm`).
- **Planificare:** dependență `dependency` conform v2 §7 pentru acest `synapse_id`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); contracte [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md), [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md).

## Limite și reconcilieri

- Slug-uri graf vs cozi `:` — aceeași disciplină ca la toate sinapsele din registrul §7.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-orchestrate-negotiation-reminder-send\``.
