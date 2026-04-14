# Sinapsă `product-embedding-generate-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-embedding-generate-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-embedding-generate/product-embedding-generate-ai-intent-classify.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-embedding-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-embedding-generate` | **Registry:** `E3_PRODUCT_EMBED` → `product:embed`. **Contract:** [`../../../neurons/E3/product--embedding--generate.md`](../../../neurons/E3/product--embedding--generate.md). |
| Destinație (graf) | `ai-intent-classify` | [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md) — etape E2/E3: vezi contract + registry. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Embedding** legat canonic de **clasificarea intenției**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** sursă E3 `product:embed`; ținta poate implica E2 — vezi contract.
- **Semantic (ADR-0002):** Matrix cu intrări duplicate pentru intent.
- **Planificare:** embed → intent.

## Limite și reconcilieri

- v2 `product:embedding:generate` vs `product:embed`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-embedding-generate-ai-intent-classify\``.
