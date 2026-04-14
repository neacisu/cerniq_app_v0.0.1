# Sinapsă `product-sync-shopify-sentiment-trend-analyze`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-sync-shopify-sentiment-trend-analyze` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-sync-shopify/product-sync-shopify-sentiment-trend-analyze.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-sync-shopify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-sync-shopify` | **Contract:** [`../../../neurons/E3/product--sync--shopify.md`](../../../neurons/E3/product--sync--shopify.md). **Gap runtime:** `product:sync:shopify` fără procesor/registry în repo la auditul din contract. |
| Destinație (graf) | `sentiment-trend-analyze` | **Registry:** `E3_SENTIMENT_TREND_ANALYZE` → `sentiment:trend:analyze`. **Contract:** [`../../../neurons/E3/sentiment--trend--analyze.md`](../../../neurons/E3/sentiment--trend--analyze.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sincronizarea cu Shopify (etichetă v2)** este legată canonic de **analiza trendului de sentiment**. v2: **„sinapsă canonică de pipeline”**; exportul nu leagă explicit sincronizarea de seriile temporale de sentiment.

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

- **Runtime (ADR-0001):** gap sursă vs analiză sentiment.
- **Semantic (ADR-0002):** product-search vs metrici sentiment.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Legătura Shopify ↔ sentiment nu este explicată în câmpurile v2 ale sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-sync-shopify-sentiment-trend-analyze\``.
