# Sinapsă `search-query-understand-mcp-session-manage`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-mcp-session-manage` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-mcp-session-manage.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Țintă | `mcp-session-manage` | [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md). **Runtime:** `mcp:session:manage` (`QUEUES.E3_MCP_SESSION_MANAGE`, `queue-registry.ts` L331). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graf, gestionarea sesiunii MCP este ordonată după traseul `search-query-understand`. Exportul nu specifică ordinea efectivă a procesării sau schema job.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `search:query:rewrite` → `mcp:session:manage`.
- **Semantic (ADR-0002):** `e3:search:query-rewrite`; `e3:mcp:session-manage` (contract neuron țintă).
- **Planificare:** v2 §7 — `search-query-understand` → `mcp-session-manage`.

## Limite și reconcilieri

- Slug graf `mcp-session-manage` vs coadă `mcp:session:manage`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-mcp-session-manage\``.
