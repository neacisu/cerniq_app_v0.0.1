# Sinapsă `pricing-competitor-check-stock-reserve-create`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `pricing-competitor-check-stock-reserve-create` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/pricing-competitor-check/pricing-competitor-check-stock-reserve-create.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `pricing-competitor-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `pricing-competitor-check` | **`pricing:competitor:check`** — `QUEUES.E3_PRICING_COMPETITOR_CHECK`. [`../../../neurons/E3/pricing--competitor--check.md`](../../../neurons/E3/pricing--competitor--check.md). |
| Destinație (graf) | `stock-reserve-create` | **`stock:reserve:create`** — `QUEUES.E3_STOCK_RESERVE_CREATE`. [`../../../neurons/E3/stock--reserve--create.md`](../../../neurons/E3/stock--reserve--create.md). |

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

- **Runtime:** `QUEUES.E3_PRICING_COMPETITOR_CHECK` → `QUEUES.E3_STOCK_RESERVE_CREATE` — `workers/shared/src/queue-registry.ts`; [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (familii `pricing` și `stock`).
- **Semantic:** contracte neuron sursă și destinație; posibile legături încrucișate de etapă în catalog — verificați `cognitive-node-catalog.ts` per `nodeKey`.
- **Planificare:** muchie **`dependency`**: `pricing-competitor-check` precede `stock-reserve-create` în export; v2 confirmă doar „sinapsă canonică de pipeline”.

## Limite și reconcilieri

- Slug-uri graf ↔ cozi `:`; fără presupuneri despre payload (absent din export). Matricea poate lista și corespondențe E4→E3 pentru rezerve — nu le confundați cu această muchie sinaptică din export fără verificare explicită.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`pricing-competitor-check-stock-reserve-create\``.
