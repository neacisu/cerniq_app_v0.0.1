# Sinapsă `search-query-understand-ai-feedback-collect`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-feedback-collect` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-feedback-collect.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Țintă | `ai-feedback-collect` | [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). **Runtime:** `feedback:collect` (`QUEUES.E3_FEEDBACK_COLLECT`, `queue-registry.ts` L326). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Dependență de planificare: colectarea feedback-ului AI este ordonată după traseul de înțelegere a interogării. Fără detalii de date sau lanț de job-uri din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `search:query:rewrite` → `feedback:collect`.
- **Semantic (ADR-0002):** `e3:search:query-rewrite`; țintă — `e3:feedback:collect` (Matrix / contract neuron).
- **Planificare:** v2 §7 — `search-query-understand` → `ai-feedback-collect`.

## Limite și reconcilieri

- Slug graf `ai-feedback-collect` vs coadă `feedback:collect` în registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-feedback-collect\``.
