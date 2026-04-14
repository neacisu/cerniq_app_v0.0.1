# Sinapsă `mcp-session-manage-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-session-manage-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-session-manage/mcp-session-manage-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-session-manage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-session-manage` | **Coadă:** `mcp:session:manage` — [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md); **Registry:** `E3_MCP_SESSION_MANAGE`. |
| Țintă | `negotiation-summary-generate` | **Matrix:** `negotiation:summary:generate` — [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). Contractul neuron: **gap runtime** la audit pentru coada literală; muchia rămâne **export-grounded**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă managementul sesiunii MCP de nodul de generare rezumat negociere în graf. v2: **„sinapsă canonică de pipeline”**. Sursa este operațională (procesor L68 în contractul neuron); ținta poate lipsi ca worker dedicat — vezi contractul neuron țintă. Nu se afirmă flux de date între cozi din export.

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
- **Semantic (ADR-0002):** sursă `e3:mcp:session-manage`; ținta fără potrivire catalog la auditul din contract neuron.
- **Planificare:** înregistrare validă în graf.

## Limite și reconcilieri

- Asimetria runtime sursă/țintă este explicită; nu se estompează în text.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-session-manage-negotiation-summary-generate\``.
