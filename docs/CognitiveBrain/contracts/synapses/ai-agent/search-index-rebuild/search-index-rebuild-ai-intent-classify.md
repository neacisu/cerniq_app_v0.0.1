# Sinapsă `search-index-rebuild-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `search-index-rebuild-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/search-index-rebuild/search-index-rebuild-ai-intent-classify.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `search-index-rebuild` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `search-index-rebuild` | **Registry:** `E3_PRODUCT_INDEX_REBUILD` -> **`product:index:rebuild`**. **Contract:** [`../../../neurons/E3/search--index--rebuild.md`](../../../neurons/E3/search--index--rebuild.md). **Notă:** v2 / Matrix `search:index:rebuild`; coada BullMQ `product:index:rebuild`. |
| Destinație (graf) | `ai-intent-classify` | **Contract (Matrix E3 row):** [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md) — același neuron referit în context E3; **runtime** și **etapa** efectivă trebuie luate din contract + registry (cozi E2/E3 pot diferi). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Reconstrucția indexului de căutare (A4)** este legată canonic de **clasificarea intenției**. v2: **„sinapsă canonică de pipeline”**; exportul nu precizează dacă intent pipeline folosește direct starea indexului.

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

- **Runtime (ADR-0001):** A4 vs posibil E2 pentru intent — vezi registry.
- **Semantic (ADR-0002):** familii și etape distincte.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Încrucișare E3/E2 pe țintă: nu presupunem un singur worker fără contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`search-index-rebuild-ai-intent-classify\``.
