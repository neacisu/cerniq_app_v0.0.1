# Sinapsă `product-category-sync-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-category-sync-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-category-sync/product-category-sync-ai-intent-classify.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-category-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-category-sync` | **Registry:** `E3_PRODUCT_CATEGORY_SYNC` → `product:category:sync`. **Contract:** [`../../../neurons/E3/product--category--sync.md`](../../../neurons/E3/product--category--sync.md). |
| Destinație (graf) | `ai-intent-classify` | **Contract (Matrix E3 row):** [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md) — același neuron referit în context E3; **runtime** și **etapa** efectivă trebuie luate din contract + registry (cozi E2/E3 pot diferi). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sync categorii** legat canonic de **clasificarea intenției**. v2: **„sinapsă canonică de pipeline”**; exportul nu precizează dacă intent pipeline folosește direct metadata de categorie.

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

- **Runtime (ADR-0001):** sursă E3 product-search; ținta poate implica cozi E2 — vezi contract neuron și registry.
- **Semantic (ADR-0002):** `nodeKey` multiple în Matrix pentru același neuron — nu simplificați fără contract.
- **Planificare:** dependență declarativă product-search → intent.

## Limite și reconcilieri

- Traseul `product-category-sync` (E3) → nod `ai-intent-classify` poate traversa etape multiple; muchia este **doar** topologie exportată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-category-sync-ai-intent-classify\``.
