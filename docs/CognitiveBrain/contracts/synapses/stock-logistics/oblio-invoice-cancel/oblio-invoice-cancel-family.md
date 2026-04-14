# Sinapsă `oblio-invoice-cancel-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `oblio-invoice-cancel-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/oblio-invoice-cancel/oblio-invoice-cancel-family.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `oblio-invoice-cancel` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `oblio-invoice-cancel` | **Contract:** [`../../../neurons/E3/oblio--invoice--cancel.md`](../../../neurons/E3/oblio--invoice--cancel.md). **Triplă autoritate:** v2 `oblio:invoice:cancel`; **runtime:** vezi contract neuron și `queue-registry.ts`. |
| Destinație (graf) | `e3-fiscal-docs` | Nod **agregat** în export (swimlane E3 / familie documente fiscale). **Nu** există rând dedicat `e3-fiscal-docs` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context: [`../../../../adr/families/e3/fiscal-docs.md`](../../../../adr/families/e3/fiscal-docs.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **oblio-invoice-cancel** este legat de nodul agregat **e3-fiscal-docs** printr-o muchie `default`, cu descrierea confirmată **„specializează familia”**: plasează anularea facturii Oblio în subgraful documentelor fiscale E3. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `oblio-invoice-cancel` → `e3-fiscal-docs`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L138** (`oblio:invoice:cancel`); ținta agregată **e3-fiscal-docs** necesită reconciliere graf ↔ catalog.
- **Runtime:** vezi neuronul sursă.

## Limite și reconcilieri

- Slug graf `oblio-invoice-cancel` ↔ `v2_queue` `oblio:invoice:cancel`.
- **`e3-fiscal-docs`:** **necesită reconciliere graf ↔ registry** pentru orice afirmație despre o singură coadă agregată.
- Arealul `stock-logistics` pentru traseele Oblio este **layout istoric**; neuronii sunt **E3 / fiscal-docs**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`oblio-invoice-cancel-family\``.
