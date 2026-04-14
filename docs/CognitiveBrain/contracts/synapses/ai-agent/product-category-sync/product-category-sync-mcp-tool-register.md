# Sinapsă `product-category-sync-mcp-tool-register`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-category-sync-mcp-tool-register` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-category-sync/product-category-sync-mcp-tool-register.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-category-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-category-sync` | **Registry:** `E3_PRODUCT_CATEGORY_SYNC` → `product:category:sync`. **Contract:** [`../../../neurons/E3/product--category--sync.md`](../../../neurons/E3/product--category--sync.md). |
| Destinație (graf) | `mcp-tool-register` | **Registry:** `E3_MCP_TOOL_REGISTER` → `mcp:tool:register`. **Contract:** [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sync categorii** legat canonic de **înregistrarea tool-urilor MCP** (set permis pentru agent). v2: **„sinapsă canonică de pipeline”**; exportul nu listează tool-uri.

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

- **Runtime (ADR-0001):** ambele în registry.
- **Semantic (ADR-0002):** vezi contracte.
- **Planificare:** product-search → MCP tool register.

## Limite și reconcilieri

- Nu confundați cu FSM tool allowlist din C13 — sunt concepte înrudite dar mapate în alt contract.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-category-sync-mcp-tool-register\``.
