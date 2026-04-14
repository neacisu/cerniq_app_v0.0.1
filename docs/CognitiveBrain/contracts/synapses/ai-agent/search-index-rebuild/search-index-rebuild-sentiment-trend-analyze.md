# Sinapsă `search-index-rebuild-sentiment-trend-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-sentiment-trend-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-sentiment-trend-analyze.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Registry:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`**. **Contract:** [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Notă:** v2 / Matrix `search:index:rebuild`; coada BullMQ `product:index:rebuild`. |
| Destinație (graf) | `sentiment-trend-analyze` | **Registry:** `E3_SENTIMENT_TREND_ANALYZE` -> `sentiment:trend:analyze`. **Contract:** [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Reconstrucția indexului de căutare (A4)** este legată canonic de **analiza trendului de sentiment**. v2: **„sinapsă canonică de pipeline”**; exportul nu leagă explicit rebuild-ul de seriile temporale de sentiment.

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

- **Runtime (ADR-0001):** A4 vs analiză sentiment.
- **Semantic (ADR-0002):** product-search vs metrici sentiment.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Legătura rebuild index / sentiment nu este explicată în câmpurile v2 ale sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-sentiment-trend-analyze\``.
