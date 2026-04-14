# Sinapsă `mcp-resource-load-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-resource-load-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-resource-load/mcp-resource-load-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-resource-load` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-resource-load` | **Coadă:** `mcp:resource:load` — [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md); **Registry:** `E3_MCP_RESOURCE_LOAD`. |
| Destinație (graf) | `negotiation-state-transition` | **Coadă:** `negotiation:state:transition` — [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md); **Registry:** `E3_NEGOTIATION_STATE_TRANSITION`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia plasează traseul MCP resource load în dependență canonică față de tranzițiile de stare ale negocierii. v2: **„sinapsă canonică de pipeline”** — fără enumerare FSM. Semantica stărilor și a mesajelor este în contractul [`negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md); legătura cu resursele MCP rămâne la nivel de planificare, nu de payload exportat.

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

- **Runtime (ADR-0001):** cozi executabile documentate pentru ambele capete.
- **Semantic (ADR-0002):** metadate din catalog (vezi contractele neuron).
- **Planificare:** dependență în graf între traseu MCP și FSM negociere.

## Limite și reconcilieri

- Fără completări despre stări sau evenimente — doar v2 §7 + contracte neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-resource-load-negotiation-state-transition\``.
