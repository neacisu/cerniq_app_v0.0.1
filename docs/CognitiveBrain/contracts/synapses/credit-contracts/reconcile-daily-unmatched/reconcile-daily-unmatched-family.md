# Sinapsă `reconcile-daily-unmatched-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-daily-unmatched-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-daily-unmatched/reconcile-daily-unmatched-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-daily-unmatched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-daily-unmatched` | **v2 / Matrix:** câmp **`reconcile:daily:unmatched`**. **Contract:** [`../../../neurons/E4/reconcile--daily--unmatched.md`](../../../neurons/E4/reconcile--daily--unmatched.md). **Limită dovedită:** la auditul din contractul neuron, **nu** există literal `reconcile:daily:unmatched` în `queue-registry.ts`; cazul „unmatched” este tratat în lanțul B7→B8→B9 — **nu** inferați o coadă BullMQ cu acest nume din graf singur. |
| Destinație (graf) | `e4-cash` | **Nod agregat:** familia **cash** E4. **ADR:** [`../../../../adr/families/e4/cash.md`](../../../../adr/families/e4/cash.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **`reconcile-daily-unmatched`** sub **`e4-cash`** în planificare. v2: **„specializează familia”**. Semantica operațională efectivă (B7/B8/B9) este **în afara** câmpurilor registrului sinapsei — vezi contractul neuron sursă.

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

- **Runtime (ADR-0001):** **necesită reconciliere graf ↔ registry** pentru sursă — vezi neuron; **`e4-cash`** nu este coadă.
- **Semantic:** Matrix `queue_in_registry` = **no** pentru acest neuron — vezi `NEURON_MATRIX.csv`.
- **Planificare:** v2 §7 ancorează traseul în familia cash.

## Limite și reconcilieri

- **Gap major:** eticheta de plan **`reconcile-daily-unmatched`** nu trebuie confundată cu o coadă executabilă dovedită în registry fără auditul din [`reconcile--daily--unmatched.md`](../../../neurons/E4/reconcile--daily--unmatched.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-daily-unmatched-family\``.
