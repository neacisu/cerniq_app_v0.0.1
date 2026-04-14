# Sinapsă `search-rerank-cross-encoder-ai-feedback-collect`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-rerank-cross-encoder-ai-feedback-collect` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-rerank-cross-encoder/search-rerank-cross-encoder-ai-feedback-collect.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-rerank-cross-encoder` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-rerank-cross-encoder` | [`../../../neurons/E3/search--rerank--cross-encoder.md`](../../../neurons/E3/search--rerank--cross-encoder.md). **Runtime:** **fără** `search:rerank:cross-encoder` în `queue-registry.ts` la auditul documentat. |
| Țintă | `ai-feedback-collect` | [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). **Runtime:** `feedback:collect` (`QUEUES.E3_FEEDBACK_COLLECT`, `queue-registry.ts` L326). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Colectarea feedback-ului AI este ordonată în planificare după traseul `search-rerank-cross-encoder`. Fără detalii de date din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; țintă — `feedback:collect`.
- **Semantic (ADR-0002):** `e3:feedback:collect` (Matrix / contract); sursă neconectată în catalog.
- **Planificare:** v2 §7 — `search-rerank-cross-encoder` → `ai-feedback-collect`.

## Limite și reconcilieri

- Slug `ai-feedback-collect` vs coadă `feedback:collect`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-rerank-cross-encoder-ai-feedback-collect\``.
