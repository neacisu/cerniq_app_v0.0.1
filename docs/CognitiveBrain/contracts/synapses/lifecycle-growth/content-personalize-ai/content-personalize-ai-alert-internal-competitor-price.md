# Sinapsă `content-personalize-ai-alert-internal-competitor-price`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-personalize-ai-alert-internal-competitor-price` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-personalize-ai/content-personalize-ai-alert-internal-competitor-price.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-personalize-ai` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `content-personalize-ai` | **Contract:** [`../../../neurons/E5/content--personalize--ai.md`](../../../neurons/E5/content--personalize--ai.md). **Triplă:** v2 `content:personalize:ai` vs runtime `content:template:render` — vezi neuron și ADR content. |
| Destinație (graf) | `alert-internal-competitor-price` | **Contract:** [`../../../neurons/E5/alert--internal--competitor-price.md`](../../../neurons/E5/alert--internal--competitor-price.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **content-personalize-ai** are dependență sintactică față de **alert-internal-competitor-price**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `content-personalize-ai` → `alert-internal-competitor-price`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron pentru sursă și țintă.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-personalize-ai-alert-internal-competitor-price\`` (L14674–L14685).
