# Sinapsă `mcp-session-manage-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-session-manage-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-session-manage/mcp-session-manage-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-session-manage` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `mcp-session-manage` | Traseu în graf; **Matrix** + registry: coada **`mcp:session:manage`**, contract [`../../../neurons/E3/mcp--session--manage.md`](../../../neurons/E3/mcp--session--manage.md). **Runtime (ADR-0001):** `QUEUES.E3_MCP_SESSION_MANAGE` în `workers/shared/src/queue-registry.ts` (ex. L331). |
| Destinație (graf) | `e3-ai-core` | Nod agregat E3 / familie **ai-core** în planificare; nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** „specializează familia” ancorează managementul sesiunii MCP (creare / prelungire / expirare pe date de negociere, vezi procesorul L68 în contractul neuron) în nucleul `e3-ai-core` din graf. Exportul sinapsei nu descrie payload sau ordinea față de alți neuroni; operaționalizarea este în contractul sursă și cod.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `mcp:session:manage` — registry + `main.ts` L258 / L68 în contractul neuron.
- **Semantic (ADR-0002):** `e3:mcp:session-manage` — catalog (contract neuron citează L2124–2131).
- **Planificare:** specializare familie; `e3-ai-core` ≠ un singur `nodeKey`.

## Limite și reconcilieri

- Slug `mcp-session-manage` vs coadă `mcp:session:manage` — Matrix + registry.
- Fără completări inventate pentru câmpurile absente din export (payload, retry, safety, telemetrie per-muchie).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — **7. Complete synapse contract register**, bloc `SYNAPSE \`mcp-session-manage-family\``.
