# Sinapsă `search-rerank-cross-encoder-ai-agent-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-rerank-cross-encoder-ai-agent-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-rerank-cross-encoder/search-rerank-cross-encoder-ai-agent-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-rerank-cross-encoder` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `search-rerank-cross-encoder` | **Matrix** + [`../../../neurons/E3/search--rerank--cross-encoder.md`](../../../neurons/E3/search--rerank--cross-encoder.md). **Runtime:** la auditul din contractul neuron, **fără** `search:rerank:cross-encoder` în `queue-registry.ts`; distinct de `search:rrf:fuse`. |
| Destinație (graf) | `ai-agent-generate` | [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). **Runtime:** la auditul documentat în contract, **fără** intrare `ai:agent:generate` în `QUEUES`; flux efectiv mapat conceptual la C14/C15 — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

În planificare, **`dependency`** declară că pasul `ai-agent-generate` depinde de traseul `search-rerank-cross-encoder`. Exportul **nu** specifică payload sau lanț BullMQ; nu se inventează mecanisme absente din v2 §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă — gap `search:rerank:cross-encoder`; destinație — gap `ai:agent:generate` (contract neuron).
- **Semantic (ADR-0002):** vezi contractele neuroni sursă și destinație; fără `nodeKey` stabil pentru `ai:agent:generate` în catalog.
- **Planificare:** v2 §7 — `search-rerank-cross-encoder` → `ai-agent-generate`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `search:rerank:cross-encoder` (`queue_in_registry` = `no`); `ai:agent:generate` (`queue_in_registry` = `no`).

## Limite și reconcilieri

- Dublu gap runtime pe ambele capete la auditul documentat; reconciliere graf ↔ registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-rerank-cross-encoder-ai-agent-generate\``.
