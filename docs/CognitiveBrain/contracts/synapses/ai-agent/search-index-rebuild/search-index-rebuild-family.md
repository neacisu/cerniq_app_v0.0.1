# Sinapsă `search-index-rebuild-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Runtime:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`** — [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Reconciliere:** v2 / Matrix folosesc adesea eticheta `search:index:rebuild`; coada BullMQ canonică în repo este `product:index:rebuild`. |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3); nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **reconstrucție index căutare (A4 în implementarea citită)** sub **`e3-product-search`**. v2: **„specializează familia”** — fără detalii FTS/trigram în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`search-index-rebuild-ai-agent-generate.md`](search-index-rebuild-ai-agent-generate.md), [`search-index-rebuild-ai-agent-orchestrate.md`](search-index-rebuild-ai-agent-orchestrate.md), [`search-index-rebuild-ai-agent-response-generate.md`](search-index-rebuild-ai-agent-response-generate.md), [`search-index-rebuild-ai-context-build.md`](search-index-rebuild-ai-context-build.md), [`search-index-rebuild-ai-feedback-collect.md`](search-index-rebuild-ai-feedback-collect.md), [`search-index-rebuild-ai-intent-classify.md`](search-index-rebuild-ai-intent-classify.md), [`search-index-rebuild-ai-prompt-optimize.md`](search-index-rebuild-ai-prompt-optimize.md), [`search-index-rebuild-ai-tool-execute.md`](search-index-rebuild-ai-tool-execute.md), [`search-index-rebuild-mcp-resource-load.md`](search-index-rebuild-mcp-resource-load.md), [`search-index-rebuild-mcp-session-manage.md`](search-index-rebuild-mcp-session-manage.md), [`search-index-rebuild-mcp-tool-register.md`](search-index-rebuild-mcp-tool-register.md), [`search-index-rebuild-sentiment-trend-analyze.md`](search-index-rebuild-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** `product:index:rebuild` în registry; vezi A4.
- **Semantic (ADR-0002):** `e3:product:index-rebuild` / `search:index:rebuild` (v2) — vezi contract neuron.
- **Planificare:** nucleu product-search agregat (`e3-product-search`).

## Limite și reconcilieri

- Slug graf `search-index-rebuild` vs coadă `product:index:rebuild`; pentru execuție prevală registry-ul.
- Detalii despre pgvector vs FTS+trigram: **numai** din contractul neuron / cod, nu din câmpurile sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-family\``.
