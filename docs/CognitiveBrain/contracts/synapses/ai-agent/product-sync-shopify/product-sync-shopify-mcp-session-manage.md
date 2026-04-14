# Sinapsă `product-sync-shopify-mcp-session-manage`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-sync-shopify-mcp-session-manage` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-sync-shopify/product-sync-shopify-mcp-session-manage.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-sync-shopify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-sync-shopify` | **Contract:** [`../../../neurons/E3/product--sync--shopify.md`](../../../neurons/E3/product--sync--shopify.md). **Gap runtime:** `product:sync:shopify` fără procesor/registry în repo la auditul din contract. |
| Destinație (graf) | `mcp-session-manage` | **Registry:** `E3_MCP_SESSION_MANAGE` → `mcp:session:manage`. **Contract:** [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sincronizarea cu Shopify (etichetă v2)** este legată canonic de **gestiunea sesiunii MCP**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** gap sursă vs sesiune MCP.
- **Semantic (ADR-0002):** vezi contracte sursă/țintă.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Fără worker sursă mapat, sesiunea MCP nu este legată automat de sincronizare Shopify în runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-sync-shopify-mcp-session-manage\``.
