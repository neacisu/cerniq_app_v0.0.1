# Sinapsă `mcp-tool-register-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-tool-register-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-tool-register/mcp-tool-register-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-tool-register` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-tool-register` | **Coadă:** `mcp:tool:register` — [`../../../neurons/E3/mcp--tool--register.md`](../../../neurons/E3/mcp--tool--register.md); **Registry:** `E3_MCP_TOOL_REGISTER`. |
| Destinație (graf) | `negotiation-expire-check` | **Coadă:** `negotiation:expire:check` — [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md); **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă sincronizarea tool-urilor MCP permise (per stare FSM) de verificarea expirării negocierilor. v2: **„sinapsă canonică de pipeline”**. Interpretare conservatoare: același pipeline E3 include atât pregătirea setului de tool-uri pentru agent, cât și mentenanța temporală a negocierilor; muchia nu afirmă că expirarea invalidează cache-ul de tool-uri sau invers.

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

- **Runtime (ADR-0001):** ambele cozi în registry — contractele neuron.
- **Semantic (ADR-0002):** nodeKey-uri din catalog.
- **Planificare:** `dependency` în graf.

## Limite și reconcilieri

- Fără presupuneri despre ordinea efectivă a job-urilor sau despre date partajate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-tool-register-negotiation-expire-check\``.
