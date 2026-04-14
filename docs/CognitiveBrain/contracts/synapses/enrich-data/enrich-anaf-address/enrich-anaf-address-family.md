# Sinapsă `enrich-anaf-address-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-anaf-address-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-anaf-address/enrich-anaf-address-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-anaf-address` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-anaf-address` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--anaf--address.md`](../../../neurons/E1/enrich--anaf--address.md). **v2_queue:** `enrich:anaf:address`. **Runtime (ADR-0001):** neuronul documentează **lipsă** literal în `queue-registry.ts`; fațeta „adresă ANAF” este acoperită operațional de **D0** pe **`enrich:anaf:full`** — vezi contract neuron. **Semantic (ADR-0002):** `e1:enrich:anaf-full-fetch` pentru calea activă citită acolo. |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-anaf-address** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”**. Detaliile despre extragerea `adresa` din răspunsul ANAF unificat și persistența în DB sunt în contractul neuron, nu în câmpurile acestei sinapse.

## Sinapse dependență în același traseu

[`enrich-anaf-address-enrich-ai-contact-parse.md`](enrich-anaf-address-enrich-ai-contact-parse.md), [`enrich-anaf-address-enrich-ai-industry-classify.md`](enrich-anaf-address-enrich-ai-industry-classify.md), [`enrich-anaf-address-enrich-ai-text-structure.md`](enrich-anaf-address-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` agregat ≠ o intrare `QUEUES`; execuția ANAF adresă urmează maparea din neuron (D0 / `enrich:anaf:full`).
- **Semantic (ADR-0002):** familia `enrichment` (v2) + catalog — vezi neuron.
- **Planificare:** v2 §7 — `enrich-anaf-address` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Slug graf `enrich-anaf-address` ≠ obligatoriu `enrich:anaf:address` ca unică coadă runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-anaf-address-family\``.
