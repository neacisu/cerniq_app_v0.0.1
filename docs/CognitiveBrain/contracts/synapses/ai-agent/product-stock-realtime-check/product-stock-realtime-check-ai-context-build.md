# Sinapsă `product-stock-realtime-check-ai-context-build`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-stock-realtime-check-ai-context-build` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-stock-realtime-check/product-stock-realtime-check-ai-context-build.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-stock-realtime-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-stock-realtime-check` | **Registry:** `E3_STOCK_REALTIME_CHECK` → **`stock:realtime:check`**. **Contract:** [`../../../neurons/E3/product--stock--realtime-check.md`](../../../neurons/E3/product--stock--realtime-check.md). |
| Destinație (graf) | `ai-context-build` | **Registry:** `E3_AI_CONTEXT_BUILD` → `ai:context:build`. **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Rezultatul verificării stocului** (product-search) este legat canonic de **asamblarea contextului AI** (C13). v2: **„sinapsă canonică de pipeline”**; exportul nu spune dacă disponibilitatea SKU alimentează direct `systemPrompt` sau doar indirect via DB.

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

- **Runtime (ADR-0001):** F33 vs `ai:context:build`.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Non-AI sursă vs pipeline context LLM: muchia rămâne structurală în graf, fără payload exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-stock-realtime-check-ai-context-build\``.
