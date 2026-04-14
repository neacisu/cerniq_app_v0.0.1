# Sinapsă `product-category-sync-ai-feedback-collect`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-category-sync-ai-feedback-collect` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-category-sync/product-category-sync-ai-feedback-collect.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-category-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-category-sync` | **Registry:** `E3_PRODUCT_CATEGORY_SYNC` → `product:category:sync`. **Contract:** [`../../../neurons/E3/product--category--sync.md`](../../../neurons/E3/product--category--sync.md). |
| Destinație (graf) | `ai-feedback-collect` | **Matrix:** `ai:feedback:collect` — [`../../../neurons/E3/ai--feedback--collect.md`](../../../neurons/E3/ai--feedback--collect.md). **Registry:** verificați constanta pentru coada consumată (contractul neuron citează `e3:feedback:collect` în catalog vs `ai:feedback:collect` în Matrix). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sync categorii** legat canonic de **colectarea feedback-ului** AI. v2: **„sinapsă canonică de pipeline”**; fără model de date feedback în sinapsă.

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

- **Runtime (ADR-0001):** sursă în registry; ținta — confirmați literalul cozii în contract neuron + registry.
- **Semantic (ADR-0002):** vezi catalog în contract `ai--feedback--collect.md`.
- **Planificare:** product-search → feedback.

## Limite și reconcilieri

- Orice decalaj `ai:feedback:collect` / `e3:feedback:collect` se rezolvă la contractul neuron, nu prin presupuneri aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-category-sync-ai-feedback-collect\``.
