# Sinapsă `mcp-resource-load-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-resource-load-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-resource-load/mcp-resource-load-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-resource-load` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-resource-load` | **Coadă:** `mcp:resource:load` — [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md); **Registry:** `E3_MCP_RESOURCE_LOAD`. |
| Destinație (graf) | `negotiation-reminder-send` | **Coadă:** `negotiation:reminder:send` — [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md); **Registry:** `E3_NEGOTIATION_REMINDER_SEND`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în planificare legătura între încărcarea resurselor MCP și trimiterea memento-urilor de negociere. Descrierea v2 este generică (**„sinapsă canonică de pipeline”**); nu reiese dacă reminder-ul consumă direct resurse MCP. Scop business (conservator): același pipeline E3 include atât suportul MCP pentru context, cât și comunicarea de follow-up în negociere — muchia fixează poziția relativă în graf, nu contractul de mesaje.

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

- **Runtime (ADR-0001):** ambele capete înregistrate în registry (vezi contractele neuron).
- **Semantic (ADR-0002):** nodeKey-uri din catalog — contracte neuron pentru `mcp:resource:load` și `negotiation:reminder:send`.
- **Planificare:** `dependency` structurală în graf.

## Limite și reconcilieri

- Canalul și conținutul reminder-ului nu fac parte din exportul sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-resource-load-negotiation-reminder-send\``.
