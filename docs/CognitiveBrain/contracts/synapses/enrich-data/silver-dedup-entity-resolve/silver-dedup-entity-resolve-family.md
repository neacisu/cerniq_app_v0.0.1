# Sinapsă `silver-dedup-entity-resolve-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-dedup-entity-resolve-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-dedup-entity-resolve/silver-dedup-entity-resolve-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-dedup-entity-resolve` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-dedup-entity-resolve` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--dedup--entity-resolve.md`](../../../neurons/E1/silver--dedup--entity-resolve.md). **Triplă autoritate:** v2 **`silver:dedup:entity-resolve`**; runtime documentat în neuron ca **`dedup:exact`** / **`e1:dedup:exact`** — **fără** literal `silver:dedup:entity-resolve` în registry. |
| Destinație (graf) | `e1-dedup` | Agregat **familie dedup E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/dedup.md`](../../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-dedup-entity-resolve** sub agregatul **`e1-dedup`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`silver-dedup-entity-resolve-silver-merge-company.md`](silver-dedup-entity-resolve-silver-merge-company.md), [`silver-dedup-entity-resolve-silver-merge-contact.md`](silver-dedup-entity-resolve-silver-merge-contact.md).

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

- **Runtime (ADR-0001):** `e1-dedup` nu este cheie în `QUEUES`; vezi neuron pentru **`dedup:exact`** și `DEDUP_EXACT` în registry.
- **Semantic (ADR-0002):** `e1:dedup:exact` — vezi `NEURON_MATRIX.csv` și `cognitive-node-catalog.ts`.
- **Planificare:** v2 §7 — `silver-dedup-entity-resolve` → `e1-dedup`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Prefix **`silver:`** în v2 vs **`dedup:exact`** în runtime — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-dedup-entity-resolve-family\``.
