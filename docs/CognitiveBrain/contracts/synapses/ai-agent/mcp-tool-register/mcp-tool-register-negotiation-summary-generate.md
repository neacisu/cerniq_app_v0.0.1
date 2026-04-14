# Sinapsă `mcp-tool-register-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-tool-register-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-tool-register/mcp-tool-register-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-tool-register` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-tool-register` | **Coadă:** `mcp:tool:register` — [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md); **Registry:** `E3_MCP_TOOL_REGISTER`. |
| Destinație (graf) | `negotiation-summary-generate` | **Matrix:** `negotiation:summary:generate` — [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). Contractul neuron: **gap runtime** la audit; muchia rămâne **export-grounded**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă înregistrarea tool-urilor MCP de generarea rezumatului de negociere în graf. v2: **„sinapsă canonică de pipeline”**. Sursa este operațională (procesor L67 în contractul neuron); ținta poate lipsi ca worker dedicat — vezi contractul neuron destinație.

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

- **Runtime (ADR-0001):** sursă în registry; ținta: reconciliere deschisă — [`negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md).
- **Semantic (ADR-0002):** sursă `e3:mcp:tool-register`; ținta fără potrivire catalog la auditul din contract neuron.
- **Planificare:** înregistrare graf validă.

## Limite și reconcilieri

- Asimetria sursă/destinație este explicită; nu se estompează.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-tool-register-negotiation-summary-generate\``.
