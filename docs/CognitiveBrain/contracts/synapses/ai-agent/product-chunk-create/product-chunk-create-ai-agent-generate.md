# Sinapsă `product-chunk-create-ai-agent-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-chunk-create-ai-agent-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-chunk-create/product-chunk-create-ai-agent-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-chunk-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-chunk-create` | **v2 / Matrix:** `product:chunk:create`. **Registry:** `E3_PRODUCT_CHUNK` → **`product:chunk`**. **Contract:** [`../../../neurons/E3/product--chunk--create.md`](../../../neurons/E3/product--chunk--create.md). |
| Destinație (graf) | `ai-agent-generate` | [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md) — **gap registry** documentat în contract; reconciliere înainte de execuție canonică. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Chunking RAG** legat canonic de **generarea agentului** în planificare. v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum chunk-urile intră în memoria agentului.

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

- **Runtime (ADR-0001):** sursă `product:chunk`; țintă — vezi contract neuron.
- **Semantic (ADR-0002):** product-search vs ai-core.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Reconciliere **`product:chunk:create`** (v2) vs **`product:chunk`** (execuție).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-chunk-create-ai-agent-generate\``.
