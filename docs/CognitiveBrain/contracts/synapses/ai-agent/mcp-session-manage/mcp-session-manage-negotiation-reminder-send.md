# Sinapsă `mcp-session-manage-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-session-manage-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-session-manage/mcp-session-manage-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-session-manage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-session-manage` | **Coadă:** `mcp:session:manage` — [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md); **Registry:** `E3_MCP_SESSION_MANAGE`. |
| Țintă | `negotiation-reminder-send` | **Coadă:** `negotiation:reminder:send` — [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md); **Registry:** `E3_NEGOTIATION_REMINDER_SEND`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, traseul de management sesiune MCP este în **dependency** față de trimiterea memento-urilor. v2 oferă doar eticheta **„sinapsă canonică de pipeline”**. Interpretare conservatoare: planificarea grupează mentenanța sesiunii (inclusiv legată de MCP) cu comunicările de urmărire în negociere; mecanismul exact e în workerul țintă, nu în export.

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

- **Runtime (ADR-0001):** cozi documentate în registry.
- **Semantic (ADR-0002):** din catalog — vezi contractele neuron sursă și țintă.
- **Planificare:** dependență declarată în export.

## Limite și reconcilieri

- Fără presupuneri despre conținutul reminder-ului sau despre starea sesiunii MCP la momentul trimiterii.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-session-manage-negotiation-reminder-send\``.
