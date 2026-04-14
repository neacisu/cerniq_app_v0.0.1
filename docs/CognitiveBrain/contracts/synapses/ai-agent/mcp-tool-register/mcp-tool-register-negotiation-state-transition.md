# Sinapsă `mcp-tool-register-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-tool-register-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-tool-register/mcp-tool-register-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-tool-register` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-tool-register` | **Coadă:** `mcp:tool:register` — [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md); **Registry:** `E3_MCP_TOOL_REGISTER`. |
| Țintă | `negotiation-state-transition` | **Coadă:** `negotiation:state:transition` — [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md); **Registry:** `E3_NEGOTIATION_STATE_TRANSITION`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia leagă în planificare înregistrarea tool-urilor MCP (derivate din starea FSM curentă, vezi procesorul L67 în contractul neuron sursă) de tranzițiile explicite de stare ale negocierii. v2 pentru sinapsă: **„sinapsă canonică de pipeline”** — nu detaliază dacă fiecare tranziție reîncarcă cache-ul de tool-uri; aceasta revine la cod, nu la export.

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
- **Semantic (ADR-0002):** vezi contractele neuron.
- **Planificare:** dependență structurală între tool register și FSM.

## Limite și reconcilieri

- Comportamentul procesorului L67 este în contractul neuron sursă; această pagină rămâne ancorată în câmpurile sinapsei din v2 §7.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-tool-register-negotiation-state-transition\``.
