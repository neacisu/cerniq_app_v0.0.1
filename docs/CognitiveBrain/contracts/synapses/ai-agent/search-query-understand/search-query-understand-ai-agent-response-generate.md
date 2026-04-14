# Sinapsă `search-query-understand-ai-agent-response-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-agent-response-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-agent-response-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Destinație (graf) | `ai-agent-response-generate` | [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime:** coada E3 folosită în flux este `ai:e3:response:generate` (`QUEUES.E3_AI_RESPONSE_GENERATE`, `queue-registry.ts` L230); **nu** literal `ai:agent:response-generate` — vezi contract neuron și Matrix. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Dependență de planificare: generarea răspunsului agent (etichetă graf `ai-agent-response-generate`) este plasată după traseul `search-query-understand`. Mecanismul concret de coadă pentru E3 diferă de forma slug-ului din graf; reconcilierea este în contractul destinație, fără completări din acest contract.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă `search:query:rewrite`; destinație executabilă `ai:e3:response:generate` (nu `ai:agent:response-generate` ca nume de coadă).
- **Semantic (ADR-0002):** vezi `e3:ai:response-generate` în Matrix / contract neuron destinație.
- **Planificare:** v2 §7 — `search-query-understand` → `ai-agent-response-generate`.

## Limite și reconcilieri

- Slug graf vs identificatori de coadă în repo pentru același rol semantic.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-agent-response-generate\``.
