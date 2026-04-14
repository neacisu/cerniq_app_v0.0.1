# Sinapsă `ai-agent-orchestrate-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-orchestrate-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-orchestrate/ai-agent-orchestrate-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-orchestrate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `ai-agent-orchestrate` | Coadă canonică **`ai:agent:orchestrate`** — [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). |
| Destinație (graf) | `negotiation-state-transition` | Coadă canonică **`negotiation:state:transition`** — [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

Dependența **`dependency`** leagă planificarea pasului `ai-agent-orchestrate` de pasul `negotiation-state-transition`: în graful exportat, tranziția FSM a negocierii este plasată după (dependent de) orchestrarea agentului. Detaliile de stare, reguli de business și mesaje între cozi **nu** sunt în câmpurile v2 §7 pentru această muchie.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** `QUEUES.E3_AI_AGENT_ORCHESTRATE` → `ai:agent:orchestrate`; `QUEUES.E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e3:ai:agent-orchestrate` — orchestrare agent; `e3:negotiation:state-transition` / `negotiation:state:transition` — „Tranziție FSM negociere B2B — aplicare regulă de business și schimbare stare” (ProceduralNeuron, `negotiation-fsm`).
- **Planificare:** muchie `dependency` din v2 §7.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); contracte [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md), [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md).

## Limite și reconcilieri

- Fără completări speculative despre stările negocierii sau payload; doar ce susține v2 §7 și contractele neuron când sunt citite separat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-orchestrate-negotiation-state-transition\``.
