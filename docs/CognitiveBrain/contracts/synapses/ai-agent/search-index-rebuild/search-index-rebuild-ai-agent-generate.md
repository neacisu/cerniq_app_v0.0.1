# Sinapsă `search-index-rebuild-ai-agent-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-ai-agent-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-ai-agent-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Registry:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`**. **Contract:** [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Notă:** v2 / Matrix `search:index:rebuild`; coada BullMQ `product:index:rebuild`. |
| Destinație (graf) | `ai-agent-generate` | **Matrix:** `ai:agent:generate` — [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). **Gap registry:** contractul neuron documentează lipsa cozii literală în `queue-registry.ts` la audit; **necesită reconciliere** înainte de a trata ținta ca worker canonic unic. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **reconstrucția indexului de căutare (A4)** este legată canonic de traseul **generare agent AI**. v2: **„sinapsă canonică de pipeline”** — fără explicație despre cum job-ul de rebuild alimentează promptul sau tool-urile agentului.

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

- **Runtime (ADR-0001):** sursă executabilă A4; țintă — vezi gap în contract neuron.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă product-search -> agent-generate.

## Limite și reconcilieri

- Cross-domain **product-search** -> **ai-core**: muchia este planificare, nu dovadă de mesaj unic între cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-ai-agent-generate\``.
