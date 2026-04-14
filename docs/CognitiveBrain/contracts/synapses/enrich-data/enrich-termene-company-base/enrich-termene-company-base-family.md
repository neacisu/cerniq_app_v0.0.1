# Sinapsă `enrich-termene-company-base-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-company-base-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-company-base/enrich-termene-company-base-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-company-base` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-company-base` | **Planificare (graf):** același identificator ca în v2 §6 pentru `enrich:termene:company-base`. Contract neuron: [`../../../neurons/E1/enrich--termene--company-base.md`](../../../neurons/E1/enrich--termene--company-base.md). **Runtime (ADR-0001):** `enrich:termene:company-base` lipsește din registry; reconcilierea graf ↔ cozi este în contractul neuron, nu aici. |
| Destinație (graf) | `e1-enrichment` | Agregat de **familie** `enrichment` în etapa E1 (plan export). Nu este o singură coadă executabilă. v2: [`### ADR-FAMILY-e1-enrichment`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR document: [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-company-base** sub agregatul **`e1-enrichment`**. v2 descrie destinația ca **„specializează familia”**: în planificare, neuronul Termene «company-base» este clasificat în familia `enrichment`, aliniată politicii de guvernanță E1 pentru acel agregat. **Contractul neuron** notează explicit gap-ul față de runtime (fără handler Termene dedicat pentru acest literal); această sinapsă nu rezolvă gap-ul — fixează doar muchia din **export**.

## Sinapse dependență în același traseu

[`enrich-termene-company-base-enrich-ai-contact-parse.md`](enrich-termene-company-base-enrich-ai-contact-parse.md), [`enrich-termene-company-base-enrich-ai-industry-classify.md`](enrich-termene-company-base-enrich-ai-industry-classify.md), [`enrich-termene-company-base-enrich-ai-text-structure.md`](enrich-termene-company-base-enrich-ai-text-structure.md).

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
| **Runtime (ADR-0001)** | `enrich:termene:company-base` (v2) vs absență în `queue-registry.ts` — vezi contract sursă și [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |
| **Semantic (ADR-0002)** | Nod catalog / etapă E1 pentru Termene: potriviri parțiale; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — intrare `enrich:termene:company-base` la **L33** (fișier). |
| **Planificare (export)** | v2 §7 — sursă `enrich-termene-company-base` → țintă `e1-enrichment`, tip `default`. |

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** eticheta de nod `enrich-termene-company-base` **nu** implică o coadă activă cu același șir — vezi auditul din contractul neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-company-base-family\``.
