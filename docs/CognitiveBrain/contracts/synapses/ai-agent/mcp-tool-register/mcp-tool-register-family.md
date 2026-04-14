# Sinapsă `mcp-tool-register-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-tool-register-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-tool-register/mcp-tool-register-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-tool-register` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `mcp-tool-register` | Traseu în graf; **Matrix** + registry: coada **`mcp:tool:register`**, contract [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md). **Runtime (ADR-0001):** `QUEUES.E3_MCP_TOOL_REGISTER` în `workers/shared/src/queue-registry.ts` (ex. L330). |
| Țintă | `e3-ai-core` | Nod agregat E3 / familie **ai-core** în planificare; nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** „specializează familia” plasează înregistrarea/sincronizarea setului de tool-uri MCP permise (din FSM, cache Redis — vezi procesorul L67 în contractul neuron) sub umbrela `e3-ai-core` din graf. Exportul sinapsei nu descrie mecanismul; detaliile sunt în contractul sursă.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `mcp:tool:register` — registry + `main.ts` L257 / procesor L67 în contractul neuron.
- **Semantic (ADR-0002):** `e3:mcp:tool-register` — catalog (contract neuron citează L2115–2122).
- **Planificare:** specializare familie; `e3-ai-core` ≠ un singur `nodeKey`.

## Limite și reconcilieri

- Slug `mcp-tool-register` vs coadă `mcp:tool:register`.
- Fără completări inventate pentru câmpurile absente din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — **7. Complete synapse contract register**, bloc `SYNAPSE \`mcp-tool-register-family\``.
