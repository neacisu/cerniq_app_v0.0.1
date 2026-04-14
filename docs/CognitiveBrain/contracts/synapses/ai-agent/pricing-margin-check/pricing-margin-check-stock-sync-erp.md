# Sinapsă `pricing-margin-check-stock-sync-erp`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-margin-check-stock-sync-erp` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-margin-check/pricing-margin-check-stock-sync-erp.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-margin-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `pricing-margin-check` | **Registry:** `E3_PRICING_MARGIN_CHECK` → `pricing:margin:check`. **Contract:** [`../../../neurons/E3/pricing--margin--check.md`](../../../neurons/E3/pricing--margin--check.md). |
| Destinație (graf) | `stock-sync-erp` | **Registry:** `E3_STOCK_SYNC_ERP` → `stock:sync:erp`. **Contract:** [`../../../neurons/E3/stock--sync--erp.md`](../../../neurons/E3/stock--sync--erp.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Guardrail marjă** legat canonic de **sync stoc ERP** în planificare. v2: **„sinapsă canonică de pipeline”** — coerența preț–inventar în sisteme externe nu este codificată în sinapsă.

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

- **Runtime (ADR-0001):** ambele în registry.
- **Semantic (ADR-0002):** contracte neuron respective.
- **Planificare:** margin → ERP sync.

## Limite și reconcilieri

- Topologie plan vs latență ERP — nu confundați cu garanție de consistență.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-margin-check-stock-sync-erp\``.
