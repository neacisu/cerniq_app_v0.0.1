# Sinapsă `enrich-termene-shareholders-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-shareholders-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-shareholders/enrich-termene-shareholders-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-shareholders` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-shareholders` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--termene--shareholders.md`](../../../neurons/E1/enrich--termene--shareholders.md). **Triplă autoritate:** v2 **`enrich:termene:shareholders`**; în runtime auditat, coada executabilă este **`enrich:termene:actionari`** (registry) / catalog **`e1:enrich:termene-actionari`** — vezi neuron; `NEURON_MATRIX.csv`: **`e1:enrich:termene-actionari`**. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-shareholders** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-termene-shareholders-enrich-ai-contact-parse.md`](enrich-termene-shareholders-enrich-ai-contact-parse.md), [`enrich-termene-shareholders-enrich-ai-industry-classify.md`](enrich-termene-shareholders-enrich-ai-industry-classify.md), [`enrich-termene-shareholders-enrich-ai-text-structure.md`](enrich-termene-shareholders-enrich-ai-text-structure.md).

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

- **Planificare:** v2 §7 — `enrich-termene-shareholders` → `e1-enrichment`.
- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; pentru acționariat Termene vezi **`enrich:termene:actionari`** în registry — aliniere față de eticheta v2 «shareholders» documentată în contractul neuronului.
- **Semantic (ADR-0002):** `e1:enrich:termene-actionari` — vezi `NEURON_MATRIX.csv` și catalog.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** nod graf **shareholders** ↔ coadă **actionari** — **necesită reconciliere** explicită (vezi neuron); fără echivalare automată a denumirilor.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-shareholders-family\``.
