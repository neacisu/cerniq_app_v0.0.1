# Sinapsă `product-category-sync-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-category-sync-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-category-sync/product-category-sync-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-category-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `product-category-sync` | **Runtime:** `E3_PRODUCT_CATEGORY_SYNC` → **`product:category:sync`** — [`../../../neurons/E3/product--category--sync.md`](../../../neurons/E3/product--category--sync.md). |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3); nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează **sincronizarea categoriilor de produs** sub **`e3-product-search`**. v2: **„specializează familia”** — fără detalii de ingest sau Shopify în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`product-category-sync-ai-agent-generate.md`](product-category-sync-ai-agent-generate.md), [`product-category-sync-ai-agent-orchestrate.md`](product-category-sync-ai-agent-orchestrate.md), [`product-category-sync-ai-agent-response-generate.md`](product-category-sync-ai-agent-response-generate.md), [`product-category-sync-ai-context-build.md`](product-category-sync-ai-context-build.md), [`product-category-sync-ai-feedback-collect.md`](product-category-sync-ai-feedback-collect.md), [`product-category-sync-ai-intent-classify.md`](product-category-sync-ai-intent-classify.md), [`product-category-sync-ai-prompt-optimize.md`](product-category-sync-ai-prompt-optimize.md), [`product-category-sync-ai-tool-execute.md`](product-category-sync-ai-tool-execute.md), [`product-category-sync-mcp-resource-load.md`](product-category-sync-mcp-resource-load.md), [`product-category-sync-mcp-session-manage.md`](product-category-sync-mcp-session-manage.md), [`product-category-sync-mcp-tool-register.md`](product-category-sync-mcp-tool-register.md), [`product-category-sync-sentiment-trend-analyze.md`](product-category-sync-sentiment-trend-analyze.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `product:category:sync` în registry.
- **Semantic (ADR-0002):** `e3:product:category-sync` — vezi contract neuron.
- **Planificare:** nucleu product-search agregat.

## Limite și reconcilieri

- Slug `product-category-sync` vs `product:category:sync`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-category-sync-family\``.
