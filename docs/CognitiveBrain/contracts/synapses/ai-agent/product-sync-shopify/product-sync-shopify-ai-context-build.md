# Sinapsă `product-sync-shopify-ai-context-build`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-sync-shopify-ai-context-build` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-sync-shopify/product-sync-shopify-ai-context-build.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-sync-shopify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-sync-shopify` | **Contract:** [`../../../neurons/E3/product--sync--shopify.md`](../../../neurons/E3/product--sync--shopify.md). **Gap runtime:** `product:sync:shopify` fără procesor/registry în repo la auditul din contract. |
| Destinație (graf) | `ai-context-build` | **Registry:** `E3_AI_CONTEXT_BUILD` → `ai:context:build`. **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Fluxul de sincronizare Shopify (planificare)** este legat canonic de **asamblarea contextului AI** (C13). v2: **„sinapsă canonică de pipeline”**; exportul nu spune dacă datele Shopify alimentează direct `systemPrompt` sau doar indirect via DB.

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

- **Runtime (ADR-0001):** gap sursă vs `ai:context:build`.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Până la mapare runtime pentru `product:sync:shopify`, muchia nu atestă flux de date real către C13.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-sync-shopify-ai-context-build\``.
