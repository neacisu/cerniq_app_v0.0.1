# Sinapsă `product-category-sync-ai-agent-response-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-category-sync-ai-agent-response-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-category-sync/product-category-sync-ai-agent-response-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-category-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-category-sync` | **Registry:** `E3_PRODUCT_CATEGORY_SYNC` → `product:category:sync`. **Contract:** [`../../../neurons/E3/product--category--sync.md`](../../../neurons/E3/product--category--sync.md). |
| Destinație (graf) | `ai-agent-response-generate` | **Neuron / Matrix:** `ai:response:generate` (E3) — [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md). **Execuție E3 sales:** coada **`ai:e3:response:generate`** (`QUEUES.E3_AI_RESPONSE_GENERATE`); există și **`ai:response:generate`** pentru E2 outreach — **nu confundați** domeniile; detalii în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Sync categorii** legat canonic de **generarea răspunsului** (lanțul C15 în repo). v2: **„sinapsă canonică de pipeline”**; fără câmpuri despre formatarea răspunsului sau validare C16.

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

- **Runtime (ADR-0001):** sursă `product:category:sync`; țintă E3 — `ai:e3:response:generate` pentru C15 (vezi contract).
- **Semantic (ADR-0002):** posibil decalaj catalog `queueName` vs registry — documentat în contract neuron.
- **Planificare:** product-search → response-generate (graf).

## Limite și reconcilieri

- Nodul graf `ai-agent-response-generate` nu este același șir cu coada E3 executată; folosiți contractul neuron pentru mapare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-category-sync-ai-agent-response-generate\``.
