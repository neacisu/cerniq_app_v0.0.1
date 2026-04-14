# Sinapsă `einvoice-archive-download-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `einvoice-archive-download-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/einvoice-archive-download/einvoice-archive-download-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `einvoice-archive-download` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `einvoice-archive-download` | **Registry (ADR-0001):** `QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD` → **`einvoice:archive:download`**. **Contract neuron:** [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |
| Destinație (graf) | `e3-fiscal-docs` | Nod **agregat** de planificare pentru familia **fiscal-docs** (E3); nu este o singură coadă BullMQ și nu există un fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** ancorează traseul **`einvoice-archive-download`** în nucleul **`e3-fiscal-docs`** din exportul de planificare. Descrierea confirmată în v2 §7 este **„specializează familia”**: relație de specializare în familia documentelor fiscale E3, **fără** payload, handler unic sau ordine de joburi în câmpurile registrului sinapsei.

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

- **Runtime (ADR-0001):** sursa executabilă pe **`einvoice:archive:download`** (`workers/shared/src/queue-registry.ts`). **`e3-fiscal-docs`** nu este cheie în registry.
- **Semantic (ADR-0002):** `e3:einvoice:archive-download` — vezi `packages/shared/src/cognitive-node-catalog.ts` în contractul neuron.
- **Planificare:** muchie **default** „specializează familia”; fără semantica operațională suplimentară în câmpurile v2 §7 pentru această muchie.

## Limite și reconcilieri

- Slug graf **`einvoice-archive-download`** ↔ coadă **`einvoice:archive:download`** nu se confundă cu alte cozi e-Factura (`einvoice:send`, `einvoice:status:check`, …) — prevală registry-ul.
- Nu reduceți **`e3-fiscal-docs`** la un singur `nodeKey` fără dovezi din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`einvoice-archive-download-family\``.
