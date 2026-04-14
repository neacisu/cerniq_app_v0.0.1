# Sinapsă `search-index-rebuild-mcp-tool-register`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-mcp-tool-register` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-mcp-tool-register.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Registry:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`**. **Contract:** [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Notă:** v2 / Matrix `search:index:rebuild`; coada BullMQ `product:index:rebuild`. |
| Destinație (graf) | `mcp-tool-register` | **Registry:** `E3_MCP_TOOL_REGISTER` -> `mcp:tool:register`. **Contract:** [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Reconstrucția indexului de căutare (A4)** este legată canonic de **înregistrarea tool-urilor MCP** (set permis pentru agent). v2: **„sinapsă canonică de pipeline”**; exportul nu listează tool-uri.

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

- **Runtime (ADR-0001):** A4 vs `mcp:tool:register`.
- **Semantic (ADR-0002):** product-search vs MCP tooling.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Înregistrarea tool-urilor nu echivalează cu job-ul A4 de rebuild.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-mcp-tool-register\``.
