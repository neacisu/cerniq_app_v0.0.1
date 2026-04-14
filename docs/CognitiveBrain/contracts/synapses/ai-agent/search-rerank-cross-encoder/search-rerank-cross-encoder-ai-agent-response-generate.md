# Sinapsă `search-rerank-cross-encoder-ai-agent-response-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-rerank-cross-encoder-ai-agent-response-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-rerank-cross-encoder/search-rerank-cross-encoder-ai-agent-response-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-rerank-cross-encoder` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-rerank-cross-encoder` | [`../../../neurons/E3/search--rerank--cross-encoder.md`](../../../neurons/E3/search--rerank--cross-encoder.md). **Runtime:** **fără** `search:rerank:cross-encoder` în `queue-registry.ts` la auditul documentat. |
| Țintă | `ai-agent-response-generate` | [`../../../neurons/E3/ai--agent--response-generate.md`](../../../neurons/E3/ai--agent--response-generate.md). **Runtime:** coada E3 folosită în flux este `ai:e3:response:generate` (`QUEUES.E3_AI_RESPONSE_GENERATE`, `queue-registry.ts` L230); **nu** literal `ai:agent:response-generate`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Dependență de planificare între rerank (etichetă graf) și generarea răspunsului agent. Fără detalii de date din export.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap; țintă executabilă `ai:e3:response:generate`.
- **Semantic (ADR-0002):** vezi contract neuron țintă / Matrix; sursă neconectată în catalog.
- **Planificare:** v2 §7 — `search-rerank-cross-encoder` → `ai-agent-response-generate`.

## Limite și reconcilieri

- Slug graf vs nume coadă E3 pentru răspuns.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-rerank-cross-encoder-ai-agent-response-generate\``.
