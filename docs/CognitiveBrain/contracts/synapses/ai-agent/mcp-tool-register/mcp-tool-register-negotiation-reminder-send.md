# Sinapsă `mcp-tool-register-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-tool-register-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-tool-register/mcp-tool-register-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-tool-register` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-tool-register` | **Coadă:** `mcp:tool:register` — [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md); **Registry:** `E3_MCP_TOOL_REGISTER`. |
| Țintă | `negotiation-reminder-send` | **Coadă:** `negotiation:reminder:send` — [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md); **Registry:** `E3_NEGOTIATION_REMINDER_SEND`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, traseul de înregistrare tool-uri MCP este în **dependency** față de reminder-ele de negociere. v2: **„sinapsă canonică de pipeline”**. Conservator: planificarea grupează configurarea capabilităților agentului (tool-uri permise) cu comunicarea de urmărire către client; canalul și conținutul reminder-ului nu fac parte din exportul sinapsei.

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

- **Runtime (ADR-0001):** cozi documentate.
- **Semantic (ADR-0002):** conform contractelor neuron sursă și țintă.
- **Planificare:** dependență declarată.

## Limite și reconcilieri

- Fără legături cauzale inventate între lista de tool-uri și textul reminder-ului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-tool-register-negotiation-reminder-send\``.
