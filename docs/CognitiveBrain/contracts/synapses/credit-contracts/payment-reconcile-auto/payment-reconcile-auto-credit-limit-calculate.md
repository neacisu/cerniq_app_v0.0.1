# Sinapsă `payment-reconcile-auto-credit-limit-calculate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-reconcile-auto-credit-limit-calculate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-reconcile-auto/payment-reconcile-auto-credit-limit-calculate.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-reconcile-auto` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-reconcile-auto` | **Registry:** `QUEUES.E4_PAYMENT_RECONCILE_AUTO` → **`payment:reconcile:auto`**. **Contract:** [`../../../neurons/E4/payment--reconcile--auto.md`](../../../neurons/E4/payment--reconcile--auto.md). |
| Destinație (graf) | `credit-limit-calculate` | **Registry:** **`credit:limit:calculate`**. **Contract:** [`../../../neurons/E4/credit--limit--calculate.md`](../../../neurons/E4/credit--limit--calculate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **reconcilierea automată** este ordonată canonic față de **calculul limitei de credit**. v2: **„sinapsă canonică de pipeline”**.

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

- **Runtime (ADR-0001):** `payment:reconcile:auto` și `credit:limit:calculate` în registry.
- **Semantic (ADR-0002):** `e4:credit:limit-calculate` — catalog.
- **Planificare:** dependență v2 §7.

## Limite și reconcilieri

- Fără inferențe despre ordinea B7 vs alți orchestratori — dovadă în cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-reconcile-auto-credit-limit-calculate\``.
