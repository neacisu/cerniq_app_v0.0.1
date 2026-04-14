# Sinapsă `pricing-competitor-check-stock-sync-erp`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-competitor-check-stock-sync-erp` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-competitor-check/pricing-competitor-check-stock-sync-erp.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-competitor-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pricing-competitor-check` | **`pricing:competitor:check`** — `QUEUES.E3_PRICING_COMPETITOR_CHECK`. [`../../../neurons/E3/pricing--competitor--check.md`](../../../neurons/E3/pricing--competitor--check.md). |
| Destinație (graf) | `stock-sync-erp` | **`stock:sync:erp`** — `QUEUES.E3_STOCK_SYNC_ERP`. [`../../../neurons/E3/stock--sync--erp.md`](../../../neurons/E3/stock--sync--erp.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime:** `QUEUES.E3_PRICING_COMPETITOR_CHECK` → `QUEUES.E3_STOCK_SYNC_ERP` — `workers/shared/src/queue-registry.ts`; [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic:** contracte neuron sursă și destinație.
- **Planificare:** muchie **`dependency`**: `pricing-competitor-check` precede `stock-sync-erp` în export; v2 nu detaliează sincronizarea ERP în registru.

## Limite și reconcilieri

- Slug-uri ↔ cozi `:`; fără presupuneri despre payload (absent din export).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-competitor-check-stock-sync-erp\``.
