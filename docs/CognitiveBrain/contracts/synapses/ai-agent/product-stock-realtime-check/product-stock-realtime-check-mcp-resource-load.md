# Sinapsă `product-stock-realtime-check-mcp-resource-load`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-stock-realtime-check-mcp-resource-load` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-stock-realtime-check/product-stock-realtime-check-mcp-resource-load.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-stock-realtime-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-stock-realtime-check` | **Registry:** `E3_STOCK_REALTIME_CHECK` → **`stock:realtime:check`**. **Contract:** [`../../../neurons/E3/product--stock--realtime-check.md`](../../../neurons/E3/product--stock--realtime-check.md). |
| Destinație (graf) | `mcp-resource-load` | **Registry:** `E3_MCP_RESOURCE_LOAD` → `mcp:resource:load`. **Contract:** [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Verificarea stocului în timp real** este legată canonic de **încărcarea resurselor MCP** (context tool-uri externe). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie URI-uri sau cache.

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

- **Runtime (ADR-0001):** F33 vs `mcp:resource:load`.
- **Semantic (ADR-0002):** product-search vs integrare MCP (ai-core adjacency în plan).
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Cross-layer product-search → MCP: dovadă structurală în export, nu mesaje implicite.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-stock-realtime-check-mcp-resource-load\``.
