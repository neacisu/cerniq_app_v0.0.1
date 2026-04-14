# Sinapsă `e3-fiscal-docs-e4-cash-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e3-fiscal-docs-e4-cash-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e3-fiscal-docs-e4-cash-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e3-fiscal-docs` | Agregat E3 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e4-cash` | Agregat E4 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e3-fiscal-docs`** de **`e4-cash`** cu tip **`related`**. În v2, descrierea confirmată este: **„transmite documentele fiscale în fluxul de plată”** — intenție de flux în planificare; exportul **nu** specifică format mesaje sau cozi.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** transmite documentele fiscale în fluxul de plată
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

- **Planificare:** v2 §7 — `e3-fiscal-docs` → `e4-cash` (legătură **cross** E3–E4).
- **Runtime (ADR-0001):** legătura fiscal–plată în cod trebuie verificată în handlers și registry, nu dedusă numai din graf.
- **Semantic (ADR-0002):** vezi catalog E3/E4; reconciliere explicită.

## Limite și reconcilieri

- **`-cross`**: puntere între etape; distinctă de lanțurile **familyflow** din interiorul unei etape.
- Detaliile documentelor fiscale și ale plății rămân în contracte neuron / cod, nu în câmpurile sinapsei v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e3-fiscal-docs-e4-cash-cross\``.
