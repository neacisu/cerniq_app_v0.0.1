# Sinapsă `e2-human-e3-ai-core-cross`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e2-human-e3-ai-core-cross` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/cross/e2-human-e3-ai-core-cross.md` |
| Areal sinaptic | `graph-plan` |
| Topologie plan | `cross` (punți între familii/etape în export; vezi [`synapses/README.md`](../../../README.md)) |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `e2-human` | Agregat E2 în planificare; **nu** este o coadă unică în ADR-0001. |
| Destinație (graf) | `e3-ai-core` | Agregat E3 în planificare; **nu** este o coadă unică în ADR-0001. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

Muchia **cross** leagă **`e2-human`** de **`e3-ai-core`** cu tip **`related`**. În v2, descrierea confirmată este: **„predă conversațiile calificate către AI sales”** — formulare planificare; exportul **nu** fixează payload, API sau cozi.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** predă conversațiile calificate către AI sales
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

- **Planificare:** v2 §7 — `e2-human` → `e3-ai-core` (legătură **cross** E2–E3).
- **Runtime (ADR-0001):** handoff uman → nucleu AI este **intenție de graf**; execuția efectivă nu reiese din câmpurile sinapsei.
- **Semantic (ADR-0002):** vezi catalog pentru swimlane-uri E2/E3; reconciliere explicită, fără presupuneri.

## Limite și reconcilieri

- **`-cross`**: muchie explicită între etape; distinctă de muchiile **familyflow** din același registru.
- „Calificate” și „AI sales” provin din textul v2, nu din cod citit aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e2-human-e3-ai-core-cross\``.
