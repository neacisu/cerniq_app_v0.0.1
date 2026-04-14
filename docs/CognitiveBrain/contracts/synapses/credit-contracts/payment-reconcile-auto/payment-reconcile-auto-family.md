# Sinapsă `payment-reconcile-auto-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-reconcile-auto-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-reconcile-auto/payment-reconcile-auto-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-reconcile-auto` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-reconcile-auto` | **Registry (ADR-0001):** `QUEUES.E4_PAYMENT_RECONCILE_AUTO` → **`payment:reconcile:auto`**. **Contract:** [`../../../neurons/E4/payment--reconcile--auto.md`](../../../neurons/E4/payment--reconcile--auto.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |
| Destinație (graf) | `e4-cash` | **Nod agregat:** familia **cash** E4. **ADR:** [`../../../../adr/families/e4/cash.md`](../../../../adr/families/e4/cash.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **reconciliere automată plăți** (`payment-reconcile-auto`) sub subgraful **`e4-cash`** în planificare. v2: **„specializează familia”** — fără payload sau ordine operațională detaliată în câmpurile sinapsei.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** sursa executabilă pe **`payment:reconcile:auto`**; **`e4-cash`** nu este cheie în registry.
- **Semantic (ADR-0002):** `e4:payment:reconcile-auto` — vezi catalog în contractul neuron.
- **Planificare:** v2 §7 — `payment-reconcile-auto` → `e4-cash`.

## Limite și reconcilieri

- Worker concret (ex. B7) și enfileuirea către cozi credit se verifică în cod; graful afirmă doar apartenența la familia cash.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-reconcile-auto-family\``.
