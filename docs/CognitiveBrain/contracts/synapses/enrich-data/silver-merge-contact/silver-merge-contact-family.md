# Sinapsă `silver-merge-contact-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-merge-contact-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-merge-contact/silver-merge-contact-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-merge-contact` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-merge-contact` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--merge--contact.md`](../../../neurons/E1/silver--merge--contact.md). **Triplă autoritate:** v2 **`silver:merge:contact`**; la audit neuron **gap** coadă/`nodeKey` literal — comportament merge-like raportat în promovare bronze→silver; vezi `NEURON_MATRIX.csv` (fără mapare semantică suplimentară pe rând). |
| Destinație (graf) | `e1-merge` | Agregat **familie merge E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/merge.md`](../../../../adr/families/e1/merge.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-merge-contact** sub agregatul **`e1-merge`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`silver-merge-contact-silver-quality-completeness.md`](silver-merge-contact-silver-quality-completeness.md), [`silver-merge-contact-silver-quality-tier-assign.md`](silver-merge-contact-silver-quality-tier-assign.md), [`silver-merge-contact-silver-quality-validation-sum.md`](silver-merge-contact-silver-quality-validation-sum.md).

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

- **Planificare:** v2 §7 — `silver-merge-contact` → `e1-merge`.
- **Runtime (ADR-0001):** `e1-merge` nu este cheie în `QUEUES`; pentru «merge contact» vezi **gap** și căi parțiale în contractul neuronului.
- **Semantic (ADR-0002):** familie `merge` — vezi catalog și ADR `merge`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs runtime:** nod planificat **silver-merge-contact** fără unitate 1:1 în registry — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-merge-contact-family\``.
