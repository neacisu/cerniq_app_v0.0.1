# Sinapsă `mcp-resource-load-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `mcp-resource-load-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/mcp-resource-load/mcp-resource-load-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `mcp-resource-load` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `mcp-resource-load` | Traseu în graf; **Matrix** + registry: coada **`mcp:resource:load`**, contract [`../../../neurons/E3/mcp--resource--load.md`](../../../neurons/E3/mcp--resource--load.md). **Runtime (ADR-0001):** `QUEUES.E3_MCP_RESOURCE_LOAD` în `workers/shared/src/queue-registry.ts` (ex. L329). |
| Țintă | `e3-ai-core` | Nod agregat E3 / familie **ai-core** în planificare; nu este o singură coadă BullMQ. Nu există un contract neuron unic pentru eticheta de graf `e3-ai-core`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** cu descrierea **„specializează familia”** ancorează traseul de încărcare resurse MCP în nucleul semantic E3 AI core din graf. v2 §7 nu precizează handler sau payload pe muchie; alinierea operațională la cozi și workeri este în contractul neuron sursă și în cod (procesor L66), nu în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** `mcp:resource:load` — vezi registry + `main.ts` / L66 în contractul neuron.
- **Semantic (ADR-0002):** `e3:mcp:resource-load` / `nodeKey` — `packages/shared/src/cognitive-node-catalog.ts` (contract neuron citează L2106–2113).
- **Planificare:** muchie de specializare familie; eticheta `e3-ai-core` nu se echivalează automat cu un singur `nodeKey`.

## Limite și reconcilieri

- Slug graf (`mcp-resource-load`) vs coadă (`mcp:resource:load`) — mapare prin Matrix și registry.
- Nu inventa payload/retry/safety/telemetrie per-muchie acolo unde v2 marchează absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — **7. Complete synapse contract register**, bloc `SYNAPSE \`mcp-resource-load-family\``.
