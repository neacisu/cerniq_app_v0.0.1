# Sinapsă `payment-reconcile-auto-credit-data-fetch-insolventa`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-reconcile-auto-credit-data-fetch-insolventa` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-reconcile-auto/payment-reconcile-auto-credit-data-fetch-insolventa.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-reconcile-auto` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-reconcile-auto` | **Registry:** `QUEUES.E4_PAYMENT_RECONCILE_AUTO` → **`payment:reconcile:auto`**. **Contract:** [`../../../neurons/E4/payment--reconcile--auto.md`](../../../neurons/E4/payment--reconcile--auto.md). |
| Destinație (graf) | `credit-data-fetch-insolventa` | **Contract:** [`../../../neurons/E4/credit--data--fetch-insolventa.md`](../../../neurons/E4/credit--data--fetch-insolventa.md). **Matrix (`NEURON_MATRIX.csv`):** `queue_in_registry` = **no** pentru `credit:data:fetch-insolventa` — **nu** afirmați execuție BullMQ directă din graf fără contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **reconcilierea automată** este ordonată canonic față de **fetch-ul de date insolvență** pentru credit. v2: **„sinapsă canonică de pipeline”** — fără detalii despre implementarea cozii sau absența ei din registry.

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

- **Runtime (ADR-0001):** sursa **`payment:reconcile:auto`** este în registry; pentru **țintă**, urmați auditul din contractul neuron (posibil nealiniat la `queue-registry.ts`).
- **Semantic (ADR-0002):** vezi mapările documentate în `credit--data--fetch-insolventa.md`.
- **Planificare:** muchie structurală graf → neuron; execuția efectivă necesită reconciliere.

## Limite și reconcilieri

- **Gap potențial graf ↔ registry** la țintă: documentat la nivel de neuron/Matrix; acest contract sinapsă nu înlocuiește acel audit.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-reconcile-auto-credit-data-fetch-insolventa\``.
