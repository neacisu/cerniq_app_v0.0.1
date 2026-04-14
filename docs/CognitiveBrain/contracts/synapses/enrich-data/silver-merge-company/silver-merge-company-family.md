# Sinapsă `silver-merge-company-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-merge-company-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-merge-company/silver-merge-company-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-merge-company` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-merge-company` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--merge--company.md`](../../../neurons/E1/silver--merge--company.md). **Triplă autoritate:** v2 **`silver:merge:company`**; runtime **fără** coadă / `nodeKey` cu acest literal — capacități înrudite în **`pipeline:promote:bronze-silver`** și **`ai:merge:xai`** — vezi neuron și `NEURON_MATRIX.csv`. |
| Destinație (graf) | `e1-merge` | Agregat **familie merge E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/merge.md`](../../../../adr/families/e1/merge.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-merge-company** sub agregatul **`e1-merge`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`silver-merge-company-silver-quality-completeness.md`](silver-merge-company-silver-quality-completeness.md), [`silver-merge-company-silver-quality-tier-assign.md`](silver-merge-company-silver-quality-tier-assign.md), [`silver-merge-company-silver-quality-validation-sum.md`](silver-merge-company-silver-quality-validation-sum.md).

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

- **Runtime (ADR-0001):** `e1-merge` nu este cheie în `QUEUES`; vezi neuron pentru **`pipeline:promote:bronze-silver`**, **`ai:merge:xai`** și intrările din registry.
- **Semantic (ADR-0002):** `e1:pipeline:promote-bronze-silver`, `e1:ai:merge-xai` (și note despre span InfraQ) — vezi neuron.
- **Planificare:** v2 §7 — `silver-merge-company` → `e1-merge`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Gap:** v2_queue `silver:merge:company` **fără** implementare 1:1 în registry — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-merge-company-family\``.
