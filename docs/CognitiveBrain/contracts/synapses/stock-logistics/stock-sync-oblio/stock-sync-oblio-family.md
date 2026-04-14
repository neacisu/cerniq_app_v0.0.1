# Sinapsă `stock-sync-oblio-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-sync-oblio-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-sync-oblio/stock-sync-oblio-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-sync-oblio` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-sync-oblio` | **Contract:** [`../../../neurons/E4/stock--sync--oblio.md`](../../../neurons/E4/stock--sync--oblio.md). **Triplă autoritate:** v2 `stock:sync:oblio` (E4 / `logistics`); **runtime:** vezi contract neuron și `queue-registry.ts`. |
| Destinație (graf) | `e4-logistics` | Nod **agregat** în export (swimlane E4 / logistică). **Nu** există rând dedicat `e4-logistics` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e4/logistics.md`](../../../../adr/families/e4/logistics.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **stock-sync-oblio** este legat de nodul agregat **e4-logistics** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează sincronizarea stocului cu Oblio în subgraful logistic E4. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `stock-sync-oblio` → `e4-logistics`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L243** (`stock:sync:oblio`); ținta agregată **e4-logistics** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `stock-sync-oblio` ↔ `v2_queue` `stock:sync:oblio`; neuronul este **E4**, nu E3 — deși arealul fișierului este `stock-logistics` (layout istoric).
- **`e4-logistics`:** **necesită reconciliere graf ↔ registry** pentru execuție agregată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-sync-oblio-family\``.
