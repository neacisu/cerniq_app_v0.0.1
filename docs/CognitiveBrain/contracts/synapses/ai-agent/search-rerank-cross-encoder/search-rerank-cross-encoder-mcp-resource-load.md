# Sinapsă `search-rerank-cross-encoder-mcp-resource-load`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-rerank-cross-encoder-mcp-resource-load` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-rerank-cross-encoder/search-rerank-cross-encoder-mcp-resource-load.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-rerank-cross-encoder` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-rerank-cross-encoder` | [`../../../neurons/E3/search--rerank--cross-encoder.md`](../../../neurons/E3/search--rerank--cross-encoder.md). **Runtime:** **fără** `search:rerank:cross-encoder` în `queue-registry.ts` la auditul documentat. |
| Țintă | `mcp-resource-load` | [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md). **Runtime:** `mcp:resource:load` (`QUEUES.E3_MCP_RESOURCE_LOAD`, `queue-registry.ts` L329). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Încărcarea resurselor MCP este ordonată în planificare după traseul rerank. Fără detalii de orchestrare din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; țintă — `mcp:resource:load`.
- **Semantic (ADR-0002):** `e3:mcp:resource-load`; sursă neconectată în catalog.
- **Planificare:** v2 §7 — `search-rerank-cross-encoder` → `mcp-resource-load`.

## Limite și reconcilieri

- Slug graf vs coadă `mcp:resource:load`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-rerank-cross-encoder-mcp-resource-load\``.
