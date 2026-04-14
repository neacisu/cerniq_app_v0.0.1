# Sinapsă `product-stock-realtime-check-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `product-stock-realtime-check-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/product-stock-realtime-check/product-stock-realtime-check-ai-intent-classify.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `product-stock-realtime-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `product-stock-realtime-check` | **Registry:** `E3_STOCK_REALTIME_CHECK` → **`stock:realtime:check`**. **Contract:** [`../../../neurons/E3/product--stock--realtime-check.md`](../../../neurons/E3/product--stock--realtime-check.md). |
| Destinație (graf) | `ai-intent-classify` | **Contract (Matrix E3 row):** [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md) — același neuron referit în context E3; **runtime** și **etapa** efectivă trebuie luate din contract + registry (cozi E2/E3 pot diferi). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Verificarea stocului în timp real** este legată canonic de **clasificarea intenției**. v2: **„sinapsă canonică de pipeline”**; exportul nu precizează dacă intent pipeline consumă direct rezultatul stocului.

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

- **Runtime (ADR-0001):** E3 sursă vs posibil E2 pentru intent — vezi registry.
- **Semantic (ADR-0002):** familii și etape distincte.
- **Planificare:** dependență declarativă product-search → intent.

## Limite și reconcilieri

- Încrucișare E3/E2 pe țintă: nu presupunem un singur worker fără contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`product-stock-realtime-check-ai-intent-classify\``.
