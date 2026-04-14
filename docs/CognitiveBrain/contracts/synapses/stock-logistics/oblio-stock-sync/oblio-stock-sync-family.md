# Sinapsă `oblio-stock-sync-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-stock-sync-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-stock-sync/oblio-stock-sync-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-stock-sync` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-stock-sync` | **Contract:** [`../../../neurons/E3/oblio--stock--sync.md`](../../../neurons/E3/oblio--stock--sync.md). **Triplă autoritate:** v2 `oblio:stock:sync`; **runtime:** vezi contract neuron și `queue-registry.ts`. |
| Destinație (graf) | `e3-fiscal-docs` | Nod **agregat** în export (swimlane E3 / familie documente fiscale). **Nu** există rând dedicat `e3-fiscal-docs` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/fiscal-docs.md`](../../../../adr/families/e3/fiscal-docs.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-stock-sync** este legat de nodul agregat **e3-fiscal-docs** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: plasează sincronizarea stocului Oblio în subgraful documentelor fiscale E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `oblio-stock-sync` → `e3-fiscal-docs`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L141** (`oblio:stock:sync`); ținta agregată **e3-fiscal-docs** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `oblio-stock-sync` ↔ `v2_queue` `oblio:stock:sync`.
- **`e3-fiscal-docs`:** **necesită reconciliere graf ↔ registry** pentru execuție agregată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-stock-sync-family\``.
