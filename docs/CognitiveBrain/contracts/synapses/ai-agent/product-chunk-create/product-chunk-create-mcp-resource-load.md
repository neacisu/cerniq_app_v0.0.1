# Sinapsă `product-chunk-create-mcp-resource-load`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-chunk-create-mcp-resource-load` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-chunk-create/product-chunk-create-mcp-resource-load.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-chunk-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-chunk-create` | **Registry:** `E3_PRODUCT_CHUNK` → `product:chunk`. **Contract:** [`../../../neurons/E3/product--chunk--create.md`](../../../neurons/E3/product--chunk--create.md). |
| Destinație (graf) | `mcp-resource-load` | **Registry:** `E3_MCP_RESOURCE_LOAD` → `mcp:resource:load`. **Contract:** [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Chunking** legat canonic de **încărcarea resurselor MCP**. v2: **„sinapsă canonică de pipeline”**.

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
- **Planificare:** chunk → MCP resource.

## Limite și reconcilieri

- v2 `product:chunk:create` vs `product:chunk`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-chunk-create-mcp-resource-load\``.
