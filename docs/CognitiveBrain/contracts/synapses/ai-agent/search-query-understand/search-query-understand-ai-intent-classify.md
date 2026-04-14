# Sinapsă `search-query-understand-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-query-understand-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-query-understand/search-query-understand-ai-intent-classify.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-query-understand` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-query-understand` | [`../../../neurons/E3/search--query--understand.md`](../../../neurons/E3/search--query--understand.md). **Runtime:** `search:query:rewrite` (`QUEUES.E3_SEARCH_QUERY_REWRITE`, `queue-registry.ts` L214). |
| Destinație (graf) | `ai-intent-classify` | [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). **Runtime:** în `queue-registry.ts` există `QUEUES.E3_INTENT_CLASSIFY` → `intent:classify` (L323); Matrix leagă și `e2:ai:intent-classify` — reconciliere etapă/cod în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În graf, clasificarea intenției este dependentă de traseul `search-query-understand`. Nu se afirmă din v2 §7 cum este propagat contextul de căutare către intent.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă `search:query:rewrite`; destinație — coadă `intent:classify` (constantă E3 în registry; vezi comentariu J în `queue-registry.ts` L155).
- **Semantic (ADR-0002):** contract neuron E2 + intrări catalog/Matrix pentru `e2:ai:intent-classify` / legături E3.
- **Planificare:** v2 §7 — `search-query-understand` → `ai-intent-classify`.

## Limite și reconcilieri

- Duplicare semantică E2/E3 și nume coadă `intent:classify` vs slug graf; vezi [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-query-understand-ai-intent-classify\``.
