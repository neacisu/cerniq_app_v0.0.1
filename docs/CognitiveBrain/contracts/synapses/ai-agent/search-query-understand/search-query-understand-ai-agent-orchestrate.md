# Sinapsă `search-query-understand-ai-agent-orchestrate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-agent-orchestrate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-agent-orchestrate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Țintă | `ai-agent-orchestrate` | [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). **Runtime:** `ai:agent:orchestrate` (`QUEUES.E3_AI_AGENT_ORCHESTRATE`, `queue-registry.ts` L228). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

**`dependency`** în graf: orchestrarea agentului (etichetă `ai-agent-orchestrate`) este planificată după/după dependență de înțelegerea interogării (`search-query-understand`). Fără afirmații despre enqueuing direct sau schemă job din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `search:query:rewrite` → `ai:agent:orchestrate`.
- **Semantic (ADR-0002):** `e3:search:query-rewrite`; țintă — `e3:ai:agent-orchestrate` (catalog — contract neuron).
- **Planificare:** v2 §7 — `search-query-understand` → `ai-agent-orchestrate`.

## Limite și reconcilieri

- Denumire v2 `search:query:understand` vs execuție `search:query:rewrite` pe sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-agent-orchestrate\``.
