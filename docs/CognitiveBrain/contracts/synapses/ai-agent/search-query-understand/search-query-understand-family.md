# Sinapsă `search-query-understand-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `search-query-understand` | Traseu în graf; **Matrix** + contract [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime (ADR-0001):** execuția ancorată la coada **`search:query:rewrite`** (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `workers/shared/src/queue-registry.ts` L214), nu la literalul `search:query:understand` — reconciliere explicită în contractul neuron. |
| Destinație (graf) | `e3-product-search` | Nod agregat **familie product-search** în planificare; nu este o singură coadă executabilă sau un `nodeKey` unic echivalent în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `search-query-understand` sub agregatul `e3-product-search` în graful de planificare. Nu se afirmă din export că agregatul este o coadă BullMQ sau că maparea sursă→cozi derivate este 1:1; detaliile de rutare rezidă în contractul neuron al sursei și în codul B7 citat acolo.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `search:query:rewrite`; agregatul `e3-product-search` nu apare ca nume de coadă în `QUEUES`.
- **Semantic (ADR-0002):** `e3:search:query-rewrite` / `search:query:rewrite` (catalog — vezi contract neuron L1554–1561).
- **Planificare:** v2 §7 — `search-query-understand` → `e3-product-search`.

## Limite și reconcilieri

- Slug graf (`search-query-understand`) vs coadă runtime (`search:query:rewrite`); v2 vs cod documentat în [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md).
- Fără completări inventate pentru câmpurile absente din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-family\``.
