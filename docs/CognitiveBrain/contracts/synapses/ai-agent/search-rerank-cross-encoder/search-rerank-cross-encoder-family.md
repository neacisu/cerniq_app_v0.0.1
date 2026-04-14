# Sinapsă `search-rerank-cross-encoder-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-rerank-cross-encoder-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-rerank-cross-encoder/search-rerank-cross-encoder-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-rerank-cross-encoder` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `search-rerank-cross-encoder` | Traseu în graf; [`../../../neurons/E3/search--rerank--cross-encoder.md`](../../../neurons/E3/search--rerank--cross-encoder.md) documentează **gap** în `workers/shared/src/queue-registry.ts` și în catalog la auditul din contract; **distinct** de `search:rrf:fuse` (B10). |
| Destinație (graf) | `e3-product-search` | Nod agregat **familie product-search** în planificare; nu este o singură coadă executabilă sau un `nodeKey` unic echivalent în catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** graph-export exact field match.

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul `search-rerank-cross-encoder` sub agregatul `e3-product-search` în graful de planificare. Nu se afirmă din export că există o coadă BullMQ executabilă pentru `search:rerank:cross-encoder` în `QUEUES`; detaliile sunt în contractul neuron al sursei.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** **fără** constantă `QUEUES` pentru `search:rerank:cross-encoder` la auditul documentat; agregatul `e3-product-search` nu este nume de coadă.
- **Semantic (ADR-0002):** **fără** `nodeKey` în catalog pentru neuronul sursă (contract neuron); ținta din graf este agregat de planificare.
- **Planificare:** v2 §7 — `search-rerank-cross-encoder` → `e3-product-search`.

## Limite și reconcilieri

- RRF (`search:rrf:fuse`) vs cross-encoder — entități separate în documentația neuronului sursă.
- Fără completări inventate pentru câmpurile absente din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-rerank-cross-encoder-family\``.
