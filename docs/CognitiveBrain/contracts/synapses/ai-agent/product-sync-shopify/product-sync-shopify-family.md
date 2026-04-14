# Sinapsă `product-sync-shopify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-sync-shopify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-sync-shopify/product-sync-shopify-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-sync-shopify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `product-sync-shopify` | **Planificare:** slug graf `product-sync-shopify`. **Contract neuron:** [`../../../neurons/E3/product--sync--shopify.md`](../../../neurons/E3/product--sync--shopify.md) — documentează **gap runtime** (fără procesor / registry / `nodeKey` catalog pentru `product:sync:shopify` la auditul din contract). |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3); nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **sincronizare Shopify** (etichetă v2) sub **`e3-product-search`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`product-sync-shopify-ai-agent-generate.md`](product-sync-shopify-ai-agent-generate.md), [`product-sync-shopify-ai-agent-orchestrate.md`](product-sync-shopify-ai-agent-orchestrate.md), [`product-sync-shopify-ai-agent-response-generate.md`](product-sync-shopify-ai-agent-response-generate.md), [`product-sync-shopify-ai-context-build.md`](product-sync-shopify-ai-context-build.md), [`product-sync-shopify-ai-feedback-collect.md`](product-sync-shopify-ai-feedback-collect.md), [`product-sync-shopify-ai-intent-classify.md`](product-sync-shopify-ai-intent-classify.md), [`product-sync-shopify-ai-prompt-optimize.md`](product-sync-shopify-ai-prompt-optimize.md), [`product-sync-shopify-ai-tool-execute.md`](product-sync-shopify-ai-tool-execute.md), [`product-sync-shopify-mcp-resource-load.md`](product-sync-shopify-mcp-resource-load.md), [`product-sync-shopify-mcp-session-manage.md`](product-sync-shopify-mcp-session-manage.md), [`product-sync-shopify-mcp-tool-register.md`](product-sync-shopify-mcp-tool-register.md), [`product-sync-shopify-sentiment-trend-analyze.md`](product-sync-shopify-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** **necesită reconciliere** — contractul neuron raportează lipsa cozii executabile în repo la audit.
- **Semantic (ADR-0002):** `product:sync:shopify` în Matrix (`NEURON_MATRIX.csv`); fără aliniere automată la catalog până la închiderea gap-ului.
- **Planificare:** nucleu product-search agregat (`e3-product-search`).

## Limite și reconcilieri

- Muchiile din acest traseu sunt **declarative** în export; **nu** atestă execuție BullMQ pentru sursă până la implementare/registry.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-sync-shopify-family\``.
