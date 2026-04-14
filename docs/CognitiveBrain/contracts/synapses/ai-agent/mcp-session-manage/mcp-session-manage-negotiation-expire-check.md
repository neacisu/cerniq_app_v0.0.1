# Sinapsă `mcp-session-manage-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-session-manage-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-session-manage/mcp-session-manage-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-session-manage` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-session-manage` | **Coadă:** `mcp:session:manage` — [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md); **Registry:** `E3_MCP_SESSION_MANAGE`. |
| Destinație (graf) | `negotiation-expire-check` | **Coadă:** `negotiation:expire:check` — [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md); **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă în planificare ciclul de sesiune MCP de verificarea expirării negocierilor. v2: **„sinapsă canonică de pipeline”** — fără detaliu de orchestrare. Conservator: același pipeline E3 poate include atât menținerea sesiunii MCP pe rânduri de negociere, cât și job-uri CRON/TTL pentru expirare; muchia indică doar poziția relativă în graf.

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

- **Runtime (ADR-0001):** ambele cozi în registry — vezi contractele neuron.
- **Semantic (ADR-0002):** nodeKey-uri MCP session manage + negociere — catalog (trimiteri în contracte).
- **Planificare:** `dependency` structurală.

## Limite și reconcilieri

- Nu se deduce din sinapsă dacă expirarea sesiunii MCP și TTL negociere sunt același eveniment.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-session-manage-negotiation-expire-check\``.
