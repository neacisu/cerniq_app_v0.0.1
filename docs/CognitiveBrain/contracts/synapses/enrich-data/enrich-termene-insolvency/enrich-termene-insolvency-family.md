# Sinapsă `enrich-termene-insolvency-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-insolvency-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-insolvency/enrich-termene-insolvency-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-insolvency` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-insolvency` | **Graf:** `enrich:termene:insolvency`. Contract neuron: [`../../../neurons/E1/enrich--termene--insolvency.md`](../../../neurons/E1/enrich--termene--insolvency.md). **Runtime:** fără coadă izolată; semnal parțial prin dosare Termene și ANAF — vezi contract. |
| Destinație (graf) | `e1-enrichment` | Agregat `enrichment` E1. v2: [`### ADR-FAMILY-e1-enrichment`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-insolvency** sub **`e1-enrichment`**, cu descrierea v2 **„specializează familia”**. În planificare, insolvența este modelată ca nod dedicat în familia de îmbogățire; **contractul neuron** explică că implementarea este **distribuită** (dosare, ANAF) și nu ca o singură coadă «insolvency». Sinapsa rămâne ancorată în **topologia exportată**.

## Sinapse dependență în același traseu

[`enrich-termene-insolvency-enrich-ai-contact-parse.md`](enrich-termene-insolvency-enrich-ai-contact-parse.md), [`enrich-termene-insolvency-enrich-ai-industry-classify.md`](enrich-termene-insolvency-enrich-ai-industry-classify.md), [`enrich-termene-insolvency-enrich-ai-text-structure.md`](enrich-termene-insolvency-enrich-ai-text-structure.md).

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
| **Runtime (ADR-0001)** | Fără `enrich:termene:insolvency` în registry; semnale în `enrich:termene:dosare` și flux ANAF — vezi contract neuron. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `enrich:termene:insolvency` la **L36** (fișier). |
| **Planificare** | v2 §7 — `enrich-termene-insolvency` → `e1-enrichment`, `default`. |

## Limite și reconcilieri

- **Suprapunere semantică** cu alți neuroni (ANAF, dosare) este explicată în contractul sursă, nu dedusă din sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-insolvency-family\``.
