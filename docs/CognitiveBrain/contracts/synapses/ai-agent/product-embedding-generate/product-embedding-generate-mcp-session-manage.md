# Sinapsă `product-embedding-generate-mcp-session-manage`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-embedding-generate-mcp-session-manage` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-embedding-generate/product-embedding-generate-mcp-session-manage.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-embedding-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-embedding-generate` | **Registry:** `E3_PRODUCT_EMBED` → `product:embed`. **Contract:** [`../../../neurons/E3/product--embedding--generate.md`](../../../neurons/E3/product--embedding--generate.md). |
| Destinație (graf) | `mcp-session-manage` | **Registry:** `E3_MCP_SESSION_MANAGE` → `mcp:session:manage`. **Contract:** [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Embedding** legat canonic de **gestiunea sesiunii MCP**. v2: **„sinapsă canonică de pipeline”**.

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
- **Planificare:** embed → MCP session.

## Limite și reconcilieri

- v2 `product:embedding:generate` vs `product:embed`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-embedding-generate-mcp-session-manage\``.
