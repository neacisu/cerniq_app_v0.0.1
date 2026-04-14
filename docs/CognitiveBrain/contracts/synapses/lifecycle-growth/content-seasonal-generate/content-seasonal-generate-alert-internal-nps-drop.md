# Sinapsă `content-seasonal-generate-alert-internal-nps-drop`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-seasonal-generate-alert-internal-nps-drop` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-seasonal-generate/content-seasonal-generate-alert-internal-nps-drop.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-seasonal-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `content-seasonal-generate` | **Contract:** [`../../../neurons/E5/content--seasonal--generate.md`](../../../neurons/E5/content--seasonal--generate.md). **Triplă:** v2 `content:seasonal:generate` — reconciliere runtime în neuron (fără coadă cu același literal în registry). |
| Destinație (graf) | `alert-internal-nps-drop` | **Contract:** [`../../../neurons/E5/alert--internal--nps-drop.md`](../../../neurons/E5/alert--internal--nps-drop.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **content-seasonal-generate** are dependență sintactică față de **alert-internal-nps-drop**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
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

- **Planificare:** v2 §7 — `content-seasonal-generate` → `alert-internal-nps-drop`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron pentru sursă și țintă.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-seasonal-generate-alert-internal-nps-drop\`` (L14817–L14828).
