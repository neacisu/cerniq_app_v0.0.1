# Sinapsă `mcp-resource-load-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-resource-load-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-resource-load/mcp-resource-load-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-resource-load` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-resource-load` | **Coadă:** `mcp:resource:load` — [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md); **Registry:** `E3_MCP_RESOURCE_LOAD`. |
| Țintă | `negotiation-summary-generate` | **Matrix:** `negotiation:summary:generate` — [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). Contractul neuron: **gap runtime** la audit (fără coadă în registry / implementare verificată acolo); muchia rămâne **export-grounded** pentru topologie. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă în planificare încărcarea resurselor MCP de generarea rezumatului de negociere. v2: **„sinapsă canonică de pipeline”**. Sursa este operațională în sensul contractului neuron (procesor L66); ținta poate **lipsi** ca execuție sub `negotiation:summary:generate` — vezi contractul neuron țintă. Nu se deduce flux end-to-end din export.

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

- **Runtime (ADR-0001):** sursă verificabilă în registry; ținta: **reconciliere deschisă** — vezi [`negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md).
- **Semantic (ADR-0002):** sursă cu `e3:mcp:resource-load`; ținta fără potrivire catalog la auditul din contract neuron.
- **Planificare:** muchie validă ca înregistrare graf.

## Limite și reconcilieri

- Gap-ul țintei nu este ascuns; această sinapsă nu îl închide.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-resource-load-negotiation-summary-generate\``.
