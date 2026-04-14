# Sinapsă `product-variant-process-ai-context-build`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-variant-process-ai-context-build` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-variant-process/product-variant-process-ai-context-build.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-variant-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-variant-process` | **Registry:** `E3_PRODUCT_VARIANT_PROCESS` -> **`product:variant:process`**. **Contract:** [`../../../neurons/E3/product--variant--process.md`](../../../neurons/E3/product--variant--process.md). |
| Destinație (graf) | `ai-context-build` | **Registry:** `E3_AI_CONTEXT_BUILD` -> `ai:context:build`. **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Structura variantelor** (product-search / metadata `gold_products`) este legată canonic de **asamblarea contextului AI** (C13). v2: **„sinapsă canonică de pipeline”**; exportul nu spune dacă variantele alimentează direct `systemPrompt` sau doar indirect via DB.

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

- **Runtime (ADR-0001):** A6 vs `ai:context:build`.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- A6 poate enfileua `product:ingest` pentru anumite variante (vezi contract neuron); muchia sinaptică nu exportă acel detaliu.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-variant-process-ai-context-build\``.
