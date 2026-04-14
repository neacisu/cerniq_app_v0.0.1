# Sinapsă `enrich-termene-financials-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-financials-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-financials/enrich-termene-financials-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-financials` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-financials` | **Graf:** `enrich:termene:financials`. Contract neuron: [`../../../neurons/E1/enrich--termene--financials.md`](../../../neurons/E1/enrich--termene--financials.md). **Runtime:** fără coadă separată; capacitatea bilanț este în `enrich:termene:balance` — vezi audit neuron. |
| Destinație (graf) | `e1-enrichment` | Agregat familie `enrichment` E1. v2: [`### ADR-FAMILY-e1-enrichment`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **enrich-termene-financials** de **`e1-enrichment`**, cu descrierea v2 **„specializează familia”**. În planificare, «financials» rămâne un nod distinct față de «balance-sheet», chiar dacă **contractul neuron** raportează că runtime-ul nu instanțiază două cozi Termene separate. Sinapsa descrie **doar** poziția în graf, nu granularitatea cozilor.

## Sinapse dependență în același traseu

[`enrich-termene-financials-enrich-ai-contact-parse.md`](enrich-termene-financials-enrich-ai-contact-parse.md), [`enrich-termene-financials-enrich-ai-industry-classify.md`](enrich-termene-financials-enrich-ai-industry-classify.md), [`enrich-termene-financials-enrich-ai-text-structure.md`](enrich-termene-financials-enrich-ai-text-structure.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Termene bilanț: `enrich:termene:balance` în registry — nu `financials` literal. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `enrich:termene:financials` la **L35** (fișier). |
| **Planificare** | v2 §7 — `enrich-termene-financials` → `e1-enrichment`, `default`. |

## Limite și reconcilieri

- Contradicția graf (nod separat) vs cod (o singură coadă bilanț) rămâne **documentată în contractul neuron**; sinapsa nu o „rezolvă”.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-financials-family\``.
