# Sinapsă `pricing-discount-calculate-stock-sync-erp`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-discount-calculate-stock-sync-erp` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-discount-calculate/pricing-discount-calculate-stock-sync-erp.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-discount-calculate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-discount-calculate` | **Registry:** `E3_PRICING_DISCOUNT_CALCULATE` → `pricing:discount:calculate`. **Contract:** [`../../../neurons/E3/pricing--discount--calculate.md`](../../../neurons/E3/pricing--discount--calculate.md). |
| Destinație (graf) | `stock-sync-erp` | **Registry:** `E3_STOCK_SYNC_ERP` → `stock:sync:erp`. **Contract:** [`../../../neurons/E3/stock--sync--erp.md`](../../../neurons/E3/stock--sync--erp.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În graf, **calculul discount-ului** precede sau este legat canonic de **sincronizarea stocului cu ERP**. v2: **„sinapsă canonică de pipeline”** — fără semantică de date; alinierea preț–stoc în sisteme externe rămâne de verificat în implementare.

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

- **Runtime (ADR-0001):** ambele cozi în registry.
- **Semantic (ADR-0002):** familii distincte — contracte neuron.
- **Planificare:** pricing → sync ERP stoc.

## Limite și reconcilieri

- Integrarea ERP poate fi asincronă și decuplată de jobul de discount — muchia exprimă **ordonare în plan**, nu atomicitate tranzacție.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-discount-calculate-stock-sync-erp\``.
