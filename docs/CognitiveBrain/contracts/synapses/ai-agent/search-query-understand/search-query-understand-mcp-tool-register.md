# Sinapsă `search-query-understand-mcp-tool-register`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-mcp-tool-register` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-mcp-tool-register.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Țintă | `mcp-tool-register` | [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md). **Runtime:** `mcp:tool:register` (`QUEUES.E3_MCP_TOOL_REGISTER`, `queue-registry.ts` L330). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, înregistrarea tool-urilor MCP depinde de traseul de înțelegere a interogării. Nu se inventează mecanisme de propagare absent din v2 §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `search:query:rewrite` → `mcp:tool:register`.
- **Semantic (ADR-0002):** `e3:search:query-rewrite`; `e3:mcp:tool-register` (contract neuron țintă).
- **Planificare:** v2 §7 — `search-query-understand` → `mcp-tool-register`.

## Limite și reconcilieri

- Slug graf `mcp-tool-register` vs coadă `mcp:tool:register`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-mcp-tool-register\``.
