# Sinapsă `search-query-understand-ai-agent-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-agent-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-agent-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | **Matrix** + [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Țintă | `ai-agent-generate` | [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). **Runtime:** la auditul documentat în contract, **fără** intrare `ai:agent:generate` în `QUEUES`; flux efectiv mapat conceptual la C14/C15 — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, **`dependency`** declară că pasul etichetat `ai-agent-generate` depinde de traseul `search-query-understand`. Exportul **nu** specifică payload, ordinea job-urilor BullMQ sau apeluri directe între cozi; nu se inventează mecanisme absente din v2 §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă ancorată la `search:query:rewrite`; țintă — gap pentru `ai:agent:generate` în registry la contractul neuron.
- **Semantic (ADR-0002):** sursă — `e3:search:query-rewrite`; țintă — fără `nodeKey` stabil pentru `ai:agent:generate` în catalog (contract neuron).
- **Planificare:** v2 §7 — `search-query-understand` → `ai-agent-generate`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `search:query:understand`; `ai:agent:generate` (`queue_in_registry` = `no`).

## Limite și reconcilieri

- Graf ↔ registry pe capătul `ai-agent-generate`: vezi contractul neuronului țintă.
- Slug-uri graf (`-`) vs cozi (`:`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-agent-generate\``.
