# Sinapsă `mcp-session-manage-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-session-manage-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-session-manage/mcp-session-manage-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-session-manage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-session-manage` | **Coadă:** `mcp:session:manage` — [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md); **Registry:** `E3_MCP_SESSION_MANAGE`. |
| Țintă | `negotiation-state-transition` | **Coadă:** `negotiation:state:transition` — [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md); **Registry:** `E3_NEGOTIATION_STATE_TRANSITION`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia poziționează managementul sesiunii MCP în raport cu tranzițiile de stare FSM ale negocierii. v2: **„sinapsă canonică de pipeline”**. Semantica tranzițiilor și orice legătură cu sesiunea MCP stau în contractele neuron dedicate (inclusiv workerul de state transition), nu în câmpurile sinapsei din v2 §7.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Runtime (ADR-0001):** ambele capete în registry.
- **Semantic (ADR-0002):** vezi contractele neuron pentru `nodeKey` / swimlane.
- **Planificare:** dependență structurală între traseu MCP session și FSM negociere.

## Limite și reconcilieri

- Fără enumerare de stări FSM sau payload — doar export + contracte neuron la nevoie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-session-manage-negotiation-state-transition\``.
