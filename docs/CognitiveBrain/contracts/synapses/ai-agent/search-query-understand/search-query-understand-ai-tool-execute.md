# Sinapsă `search-query-understand-ai-tool-execute`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-tool-execute` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-tool-execute.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Destinație (graf) | `ai-tool-execute` | [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). **Runtime:** la auditul din contractul neuron, **fără** `ai:tool:execute` în `queue-registry.ts`; `queue_in_registry` = `no` în [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graf, execuția tool-urilor AI este ordonată după traseul de înțelegere a interogării. Exportul nu descrie payload sau lanț BullMQ între `search:query:rewrite` și o coadă `ai:tool:execute` (lipsă din registry la auditul documentat).

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă `search:query:rewrite`; destinație — gap în `QUEUES` (contract neuron).
- **Semantic (ADR-0002):** fără `nodeKey` stabil în catalog pentru `ai:tool:execute` (contract neuron).
- **Planificare:** v2 §7 — `search-query-understand` → `ai-tool-execute`.

## Limite și reconcilieri

- Graf ↔ runtime pe capătul `ai-tool-execute`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-tool-execute\``.
