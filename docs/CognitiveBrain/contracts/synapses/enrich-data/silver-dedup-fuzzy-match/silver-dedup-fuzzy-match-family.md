# Sinapsă `silver-dedup-fuzzy-match-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-dedup-fuzzy-match-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-dedup-fuzzy-match/silver-dedup-fuzzy-match-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-dedup-fuzzy-match` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-dedup-fuzzy-match` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--dedup--fuzzy-match.md`](../../../neurons/E1/silver--dedup--fuzzy-match.md). **Triplă autoritate:** v2 **`silver:dedup:fuzzy-match`**; runtime **`dedup:fuzzy`** / **`e1:dedup:fuzzy`** — vezi neuron și `NEURON_MATRIX.csv`. |
| Destinație (graf) | `e1-dedup` | Agregat **familie dedup E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/dedup.md`](../../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-dedup-fuzzy-match** sub agregatul **`e1-dedup`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`silver-dedup-fuzzy-match-silver-merge-company.md`](silver-dedup-fuzzy-match-silver-merge-company.md), [`silver-dedup-fuzzy-match-silver-merge-contact.md`](silver-dedup-fuzzy-match-silver-merge-contact.md).

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

- **Runtime (ADR-0001):** `e1-dedup` nu este cheie în `QUEUES`; coada documentată: **`dedup:fuzzy`** (`DEDUP_FUZZY`) — vezi neuron.
- **Semantic (ADR-0002):** `e1:dedup:fuzzy` — vezi catalog.
- **Planificare:** v2 §7 — `silver-dedup-fuzzy-match` → `e1-dedup`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Prefix **`silver:`** în v2 vs **`dedup:fuzzy`** în runtime — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-dedup-fuzzy-match-family\``.
