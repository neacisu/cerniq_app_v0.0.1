# Sinapsă `product-stock-realtime-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-stock-realtime-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-stock-realtime-check/product-stock-realtime-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-stock-realtime-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `product-stock-realtime-check` | **Runtime:** `E3_STOCK_REALTIME_CHECK` → **`stock:realtime:check`** — [`../../../neurons/E3/product--stock--realtime-check.md`](../../../neurons/E3/product--stock--realtime-check.md). Matrix / neuron notează și etichete v2 cu prefix `product:`; execuția canonică în repo este `stock:realtime:check`. |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3); nu o coadă unică. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **verificare stoc în timp real** sub **`e3-product-search`**. v2: **„specializează familia”** — fără detalii de payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`product-stock-realtime-check-ai-agent-generate.md`](product-stock-realtime-check-ai-agent-generate.md), [`product-stock-realtime-check-ai-agent-orchestrate.md`](product-stock-realtime-check-ai-agent-orchestrate.md), [`product-stock-realtime-check-ai-agent-response-generate.md`](product-stock-realtime-check-ai-agent-response-generate.md), [`product-stock-realtime-check-ai-context-build.md`](product-stock-realtime-check-ai-context-build.md), [`product-stock-realtime-check-ai-feedback-collect.md`](product-stock-realtime-check-ai-feedback-collect.md), [`product-stock-realtime-check-ai-intent-classify.md`](product-stock-realtime-check-ai-intent-classify.md), [`product-stock-realtime-check-ai-prompt-optimize.md`](product-stock-realtime-check-ai-prompt-optimize.md), [`product-stock-realtime-check-ai-tool-execute.md`](product-stock-realtime-check-ai-tool-execute.md), [`product-stock-realtime-check-mcp-resource-load.md`](product-stock-realtime-check-mcp-resource-load.md), [`product-stock-realtime-check-mcp-session-manage.md`](product-stock-realtime-check-mcp-session-manage.md), [`product-stock-realtime-check-mcp-tool-register.md`](product-stock-realtime-check-mcp-tool-register.md), [`product-stock-realtime-check-sentiment-trend-analyze.md`](product-stock-realtime-check-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** `stock:realtime:check` în registry; vezi contract F33.
- **Semantic (ADR-0002):** `e3:stock:realtime-check` / `product:stock:realtime-check` în Matrix — vezi contract neuron pentru reconciliere prefixe.
- **Planificare:** nucleu product-search agregat (`e3-product-search`).

## Limite și reconcilieri

- Slug graf `product-stock-realtime-check` vs coadă `stock:realtime:check`; pentru execuție prevală registry-ul și contractul neuron.
- Nu inventa schemă payload / retry / safety / telemetrie dincolo de câmpurile sinapsei din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-stock-realtime-check-family\``.
