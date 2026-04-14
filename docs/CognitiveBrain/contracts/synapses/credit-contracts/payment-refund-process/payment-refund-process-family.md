# Sinapsă `payment-refund-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `payment-refund-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/payment-refund-process/payment-refund-process-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `payment-refund-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `payment-refund-process` | **v2 / graf:** etichetă nod **`payment-refund-process`**. **Execuție (ADR-0001):** coada BullMQ este **`revolut:refund:process`** (`QUEUES.E4_REVOLUT_REFUND_PROCESS`) — **nu** literalul `payment:refund:process` din câmpurile v2/neuron fără reconciliere. **Contract:** [`../../../neurons/E4/payment--refund--process.md`](../../../neurons/E4/payment--refund--process.md). |
| Destinație (graf) | `e4-cash` | **Nod agregat:** familia **cash** E4. **ADR:** [`../../../../adr/families/e4/cash.md`](../../../../adr/families/e4/cash.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **procesare rambursare** (`payment-refund-process`) sub **`e4-cash`** în planificare. v2: **„specializează familia”** — fără payload operațional în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** execuție pe **`revolut:refund:process`**; **`e4-cash`** nu este coadă.
- **Semantic (ADR-0002):** `e4:revolut:refund-process` — catalog (vezi contract neuron).
- **Planificare:** slug graf `payment-refund-process` ≠ literal coadă runtime — triplă autoritate documentată.

## Limite și reconcilieri

- **Triplă denumire:** nod plan `payment-refund-process` ↔ câmp v2 „Confirmed queue field” **`payment:refund:process`** ↔ runtime **`revolut:refund:process`** — pentru execuție prevală registry-ul și workerul A4 (vezi neuron).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`payment-refund-process-family\``.
