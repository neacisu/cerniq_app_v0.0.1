# Sinapsă `product-stock-realtime-check-ai-agent-orchestrate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-stock-realtime-check-ai-agent-orchestrate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-stock-realtime-check/product-stock-realtime-check-ai-agent-orchestrate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-stock-realtime-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-stock-realtime-check` | **Registry:** `E3_STOCK_REALTIME_CHECK` → **`stock:realtime:check`**. **Contract:** [`../../../neurons/E3/product--stock--realtime-check.md`](../../../neurons/E3/product--stock--realtime-check.md). |
| Destinație (graf) | `ai-agent-orchestrate` | **Registry:** `E3_AI_AGENT_ORCHESTRATE` → `ai:agent:orchestrate`. **Contract:** [`../../../neurons/E3/ai--agent--orchestrate.md`](../../../neurons/E3/ai--agent--orchestrate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Verificarea stocului în timp real** este ordonată canonic față de **orchestrarea agentului** (C14). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum stocul disponibil intră în fluxul negocierii.

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

- **Runtime (ADR-0001):** sursă executabilă; țintă `ai:agent:orchestrate` — vezi registry.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă în export.

## Limite și reconcilieri

- Muchia nu dovedește un singur job care leagă direct F33 de C14 fără reconciliere în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-stock-realtime-check-ai-agent-orchestrate\``.
