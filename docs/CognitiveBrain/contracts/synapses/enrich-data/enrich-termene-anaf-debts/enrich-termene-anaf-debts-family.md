# Sinapsă `enrich-termene-anaf-debts-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-anaf-debts-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-anaf-debts/enrich-termene-anaf-debts-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-anaf-debts` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-anaf-debts` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--termene--anaf-debts.md`](../../../neurons/E1/enrich--termene--anaf-debts.md). **Triplă autoritate:** v2 **`enrich:termene:anaf-debts`**; runtime documentat în neuron ca flux **ANAF** (`enrich:anaf:full`, fragmente `enrich:anaf:datorii`), **nu** literal `enrich:termene:anaf-debts` în registry — vezi neuron și `NEURON_MATRIX.csv` (`e1:enrich:anaf-full-fetch|e1:enrich:anaf-datorii`). |
| Destinație (graf) | `e1-enrichment` | Agregat **familie enrichment E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **enrich-termene-anaf-debts** sub agregatul **`e1-enrichment`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

[`enrich-termene-anaf-debts-enrich-ai-contact-parse.md`](enrich-termene-anaf-debts-enrich-ai-contact-parse.md), [`enrich-termene-anaf-debts-enrich-ai-industry-classify.md`](enrich-termene-anaf-debts-enrich-ai-industry-classify.md), [`enrich-termene-anaf-debts-enrich-ai-text-structure.md`](enrich-termene-anaf-debts-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** `e1-enrichment` nu este cheie în `QUEUES`; mapare operațională **ANAF** — vezi neuron (`enrich:anaf:full`, `ENRICH_ANAF_DATORII`, etc.).
- **Semantic (ADR-0002):** `e1:enrich:anaf-full-fetch` / `e1:enrich:anaf-datorii` — vezi neuron și catalog.
- **Planificare:** v2 §7 — `enrich-termene-anaf-debts` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Prefix **Termene** în eticheta graf / v2_queue vs implementare **ANAF** documentată — **necesită reconciliere graf ↔ registry** — vezi neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-anaf-debts-family\``.
