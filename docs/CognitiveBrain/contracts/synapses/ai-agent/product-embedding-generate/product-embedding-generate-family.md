# Sinapsă `product-embedding-generate-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-embedding-generate-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-embedding-generate/product-embedding-generate-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-embedding-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `product-embedding-generate` | **v2 / Matrix:** `product:embedding:generate`. **Runtime:** `E3_PRODUCT_EMBED` → **`product:embed`** — vezi [`../../../neurons/E3/product--embedding--generate.md`](../../../neurons/E3/product--embedding--generate.md) (divergențe nume și clasificare AI documentate acolo). |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul de **generare embedding produs** sub **`e3-product-search`**. v2: **„specializează familia”**. Detaliile A2 / `embedText` / upsert vector sunt în contractul neuron, nu în câmpurile sinapsei §7.

## Sinapse dependență în același traseu

[`product-embedding-generate-ai-agent-generate.md`](product-embedding-generate-ai-agent-generate.md), [`product-embedding-generate-ai-agent-orchestrate.md`](product-embedding-generate-ai-agent-orchestrate.md), [`product-embedding-generate-ai-agent-response-generate.md`](product-embedding-generate-ai-agent-response-generate.md), [`product-embedding-generate-ai-context-build.md`](product-embedding-generate-ai-context-build.md), [`product-embedding-generate-ai-feedback-collect.md`](product-embedding-generate-ai-feedback-collect.md), [`product-embedding-generate-ai-intent-classify.md`](product-embedding-generate-ai-intent-classify.md), [`product-embedding-generate-ai-prompt-optimize.md`](product-embedding-generate-ai-prompt-optimize.md), [`product-embedding-generate-ai-tool-execute.md`](product-embedding-generate-ai-tool-execute.md), [`product-embedding-generate-mcp-resource-load.md`](product-embedding-generate-mcp-resource-load.md), [`product-embedding-generate-mcp-session-manage.md`](product-embedding-generate-mcp-session-manage.md), [`product-embedding-generate-mcp-tool-register.md`](product-embedding-generate-mcp-tool-register.md), [`product-embedding-generate-sentiment-trend-analyze.md`](product-embedding-generate-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** execuție pe **`product:embed`** — registry L207.
- **Semantic (ADR-0002):** `e3:product:embed` — fără literal `product:embedding:generate` în catalog (contract neuron).
- **Planificare:** nucleu product-search.

## Limite și reconcilieri

- Slug `product-embedding-generate` ↔ v2 `product:embedding:generate` ↔ runtime `product:embed`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-embedding-generate-family\``.
