# Sinapsă `mcp-resource-load-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-resource-load-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-resource-load/mcp-resource-load-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-resource-load` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `mcp-resource-load` | **Coadă:** `mcp:resource:load` — [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md); **Registry:** `E3_MCP_RESOURCE_LOAD`. |
| Destinație (graf) | `negotiation-expire-check` | **Coadă:** `negotiation:expire:check` — [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md); **Registry:** `E3_NEGOTIATION_EXPIRE_CHECK`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **dependency** leagă traseul de încărcare resurse MCP de verificarea expirării negocierilor; v2 dă doar **„sinapsă canonică de pipeline”** — fără flux de date între cozi. Interpretare conservatoare: planificarea plasează infrastructura MCP (resurse) în același lanț conceptual cu operațiile de TTL/expirare negociere; detaliile (D23, abandon queue etc.) sunt în contractul neuron destinație, nu în registrul sinapsei.

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

- **Runtime (ADR-0001):** ambele cozi au constante în `queue-registry.ts` (vezi contractele neuron).
- **Semantic (ADR-0002):** `e3:mcp:resource-load` și perechi pentru negociere expirare — din catalog (trimiteri în contractele neuron).
- **Planificare:** ordine/dependență declarată în graf; nu implică același mesaj sau aceeași tranzacție.

## Limite și reconcilieri

- Fără presupuneri despre payload între `mcp:resource:load` și `negotiation:expire:check`.
- Slug-uri graf vs literali coadă — disciplină standard (Matrix + registry).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`mcp-resource-load-negotiation-expire-check\``.
