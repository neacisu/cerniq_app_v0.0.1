# Sinapsă `enrich-termene-balance-sheet-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-balance-sheet-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-balance-sheet/enrich-termene-balance-sheet-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-balance-sheet` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-balance-sheet` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--termene--balance-sheet.md`](../../../neurons/E1/enrich--termene--balance-sheet.md). **Triplă autoritate:** v2 **`enrich:termene:balance-sheet`**; runtime **`enrich:termene:balance`** cu **`e1:enrich:termene-balance`** — vezi neuron (`ENRICH_TERMENE_BALANCE`). |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-balance-sheet** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-termene-balance-sheet-enrich-ai-contact-parse.md`](enrich-termene-balance-sheet-enrich-ai-contact-parse.md), [`enrich-termene-balance-sheet-enrich-ai-industry-classify.md`](enrich-termene-balance-sheet-enrich-ai-industry-classify.md), [`enrich-termene-balance-sheet-enrich-ai-text-structure.md`](enrich-termene-balance-sheet-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; coada documentată: **`enrich:termene:balance`** — vezi neuron și `queue-registry.ts`.
- **Semantic (ADR-0002):** `e1:enrich:termene-balance` — vezi neuron și `cognitive-node-catalog.ts`.
- **Planificare:** v2 §7 — `enrich-termene-balance-sheet` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Diferență lexicală:** v2 / graf **`balance-sheet`** vs coadă runtime **`enrich:termene:balance`** — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-balance-sheet-family\``.
