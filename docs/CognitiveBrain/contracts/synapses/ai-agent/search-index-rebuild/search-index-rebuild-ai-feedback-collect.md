# Sinapsă `search-index-rebuild-ai-feedback-collect`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-ai-feedback-collect` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-ai-feedback-collect.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Registry:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`**. **Contract:** [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Notă:** v2 / Matrix `search:index:rebuild`; coada BullMQ `product:index:rebuild`. |
| Destinație (graf) | `ai-feedback-collect` | **Matrix:** `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). **Registry:** verificați constanta pentru coada consumată (contractul neuron citează `e3:feedback:collect` în catalog vs `ai:feedback:collect` în Matrix). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Reconstrucția indexului de căutare (A4)** este legată canonic de **colectarea feedback-ului** AI. v2: **„sinapsă canonică de pipeline”**; fără model de date feedback în sinapsă.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** reconciliere cozi feedback — vezi contractul țintă.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Muchia nu leagă explicit succesul rebuild de schema feedback.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-ai-feedback-collect\``.
