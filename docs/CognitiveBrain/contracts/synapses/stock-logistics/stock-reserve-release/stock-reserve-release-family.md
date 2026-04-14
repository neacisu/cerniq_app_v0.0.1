# Sinapsă `stock-reserve-release-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `stock-reserve-release-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/stock-reserve-release/stock-reserve-release-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `stock-reserve-release` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `stock-reserve-release` | **Contract:** [`../../../neurons/E3/stock--reserve--release.md`](../../../neurons/E3/stock--reserve--release.md). **Triplă autoritate:** v2 `stock:reserve:release` (E3 / `stock`); **runtime:** vezi contract neuron și `queue-registry.ts`. |
| Destinație (graf) | `e3-stock` | Nod **agregat** în export (swimlane E3 / stoc). **Nu** există rând dedicat `e3-stock` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/stock.md`](../../../../adr/families/e3/stock.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **stock-reserve-release** este legat de nodul agregat **e3-stock** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: poziționează eliberarea rezervării de stoc în subgraful de stoc E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `stock-reserve-release` → `e3-stock`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L175** (`stock:reserve:release`); ținta agregată **e3-stock** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `stock-reserve-release` ↔ `v2_queue` `stock:reserve:release`.
- **`e3-stock`:** **necesită reconciliere graf ↔ registry** pentru execuție agregată.
- Areal `stock-logistics` este layout istoric; neuron sursă este **E3 / stock**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`stock-reserve-release-family\``.
