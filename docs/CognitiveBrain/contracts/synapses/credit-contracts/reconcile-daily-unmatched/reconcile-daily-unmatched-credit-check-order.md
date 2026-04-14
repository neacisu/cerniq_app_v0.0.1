# Sinapsă `reconcile-daily-unmatched-credit-check-order`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-daily-unmatched-credit-check-order` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-daily-unmatched/reconcile-daily-unmatched-credit-check-order.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-daily-unmatched` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-daily-unmatched` | **Graf / v2:** `reconcile-daily-unmatched` / `reconcile:daily:unmatched`. **Execuție:** **nu** este codificată în registrul sinapsei; vezi [`../../../neurons/E4/reconcile--daily--unmatched.md`](../../../neurons/E4/reconcile--daily--unmatched.md) și lanțul B7→B8→B9. |
| Destinație (graf) | `credit-check-order` | **Registry:** **`credit:check:order`**. **Contract:** [`../../../neurons/E4/credit--check--order.md`](../../../neurons/E4/credit--check--order.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că traseul **`reconcile-daily-unmatched`** este ordonat canonic față de **`credit-check-order`**. v2: **„sinapsă canonică de pipeline”**. Cum anume se propagă evenimentul din fluxul real de reconciliere spre verificarea creditului **nu** apare în câmpurile v2 ale sinapsei.

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

- **Runtime:** ținta **`credit:check:order`** este în registry; sursa necesită reconciliere conform neuronului `reconcile--daily--unmatched`.
- **Semantic / planificare:** topologie exportată vs implementare B7/B8/B9.

## Limite și reconcilieri

- **Matrix:** `queue_in_registry` = **no** pentru sursă — nu presupuneți worker dedicat cu numele graf.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-daily-unmatched-credit-check-order\``.
