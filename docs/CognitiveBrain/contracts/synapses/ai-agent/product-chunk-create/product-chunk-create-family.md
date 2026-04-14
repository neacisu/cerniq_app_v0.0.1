# Sinapsă `product-chunk-create-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-chunk-create-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-chunk-create/product-chunk-create-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-chunk-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `product-chunk-create` | **v2 / Matrix:** coadă nominală **`product:chunk:create`**. **Runtime (ADR-0001):** `E3_PRODUCT_CHUNK` → **`product:chunk`** — reconciliere obligatorie; vezi [`../../../neurons/E3/product--chunk--create.md`](../../../neurons/E3/product--chunk--create.md). |
| Destinație (graf) | `e3-product-search` | Agregat **product-search** (E3). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** poziționează traseul de **creare chunk-uri RAG** sub **`e3-product-search`**. v2: **„specializează familia”**. Divergența nume v2 vs coada BullMQ este documentată în contractul neuron, nu inventată aici.

## Sinapse dependență în același traseu

[`product-chunk-create-ai-agent-generate.md`](product-chunk-create-ai-agent-generate.md), [`product-chunk-create-ai-agent-orchestrate.md`](product-chunk-create-ai-agent-orchestrate.md), [`product-chunk-create-ai-agent-response-generate.md`](product-chunk-create-ai-agent-response-generate.md), [`product-chunk-create-ai-context-build.md`](product-chunk-create-ai-context-build.md), [`product-chunk-create-ai-feedback-collect.md`](product-chunk-create-ai-feedback-collect.md), [`product-chunk-create-ai-intent-classify.md`](product-chunk-create-ai-intent-classify.md), [`product-chunk-create-ai-prompt-optimize.md`](product-chunk-create-ai-prompt-optimize.md), [`product-chunk-create-ai-tool-execute.md`](product-chunk-create-ai-tool-execute.md), [`product-chunk-create-mcp-resource-load.md`](product-chunk-create-mcp-resource-load.md), [`product-chunk-create-mcp-session-manage.md`](product-chunk-create-mcp-session-manage.md), [`product-chunk-create-mcp-tool-register.md`](product-chunk-create-mcp-tool-register.md), [`product-chunk-create-sentiment-trend-analyze.md`](product-chunk-create-sentiment-trend-analyze.md).

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

- **Runtime (ADR-0001):** execuție pe **`product:chunk`** — vezi registry L208.
- **Semantic (ADR-0002):** `e3:product:chunk` — fără `product:chunk:create` literal în catalog (contract neuron).
- **Planificare:** nucleu product-search.

## Limite și reconcilieri

- Slug graf `product-chunk-create` ↔ v2 `product:chunk:create` ↔ runtime `product:chunk` — trei straturi de denumire.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-chunk-create-family\``.
