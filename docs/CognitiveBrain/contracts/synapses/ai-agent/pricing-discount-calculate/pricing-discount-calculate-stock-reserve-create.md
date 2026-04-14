# Sinapsă `pricing-discount-calculate-stock-reserve-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-discount-calculate-stock-reserve-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-discount-calculate/pricing-discount-calculate-stock-reserve-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-discount-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-discount-calculate` | **Registry:** `E3_PRICING_DISCOUNT_CALCULATE` → `pricing:discount:calculate`. **Contract:** [`../../../neurons/E3/pricing--discount--calculate.md`](../../../neurons/E3/pricing--discount--calculate.md). **Familie v2:** `pricing`. |
| Destinație (graf) | `stock-reserve-create` | **Registry:** `E3_STOCK_RESERVE_CREATE` → `stock:reserve:create`. **Contract:** [`../../../neurons/E3/stock--reserve--create.md`](../../../neurons/E3/stock--reserve--create.md). **Familie v2:** `stock`. **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **calculul discount-ului** este legat canonic de **crearea rezervării de stoc**. v2: **„sinapsă canonică de pipeline”** — fără detalii despre când se blochează stocul sau cum se propagă `tenantId`/`productId`. Sens declarativ: politica de preț și disponibilitatea fizică sunt ordonate în același pipeline la nivel de graf.

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

- **Runtime (ADR-0001):** ambele cozi în `queue-registry.ts` — constantele de mai sus.
- **Semantic (ADR-0002):** familii **pricing** vs **stock** — `nodeKey` din contractele neuron.
- **Planificare:** dependență declarativă cross-swimlane între discount și rezervare.

## Limite și reconcilieri

- Muchia nu dovedește enfileuire directă între workeri; verificați producătorii `queue.add` în cod.
- Slug-uri graf (`stock-reserve-create`) vs `stock:reserve:create`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-discount-calculate-stock-reserve-create\``.
