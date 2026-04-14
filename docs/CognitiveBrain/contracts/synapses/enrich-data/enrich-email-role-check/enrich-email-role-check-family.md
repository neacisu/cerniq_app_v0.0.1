# Sinapsă `enrich-email-role-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-role-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-role-check/enrich-email-role-check-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-role-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-email-role-check` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--email--role-check.md`](../../../neurons/E1/enrich--email--role-check.md). **v2_queue:** `enrich:email:role-check`. **Runtime (ADR-0001):** fără coadă dedicată; indicatorul **role** vine din **Hunter email-verifier** pe **`discover:email:hunter-verify`** — vezi neuron. |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **verificare email «role-based»** (`enrich-email-role-check`) sub **`e1-enrichment`**. v2: **„specializează familia”**. Detaliile din `g2-hunter-verifier` / `hunter-api-client` sunt în contractul neuron.

## Sinapse dependență în același traseu

[`enrich-email-role-check-enrich-ai-contact-parse.md`](enrich-email-role-check-enrich-ai-contact-parse.md), [`enrich-email-role-check-enrich-ai-industry-classify.md`](enrich-email-role-check-enrich-ai-industry-classify.md), [`enrich-email-role-check-enrich-ai-text-structure.md`](enrich-email-role-check-enrich-ai-text-structure.md).

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

- **Runtime (ADR-0001):** agregat `e1-enrichment` vs `discover:email:hunter-verify` — vezi neuron.
- **Semantic (ADR-0002):** `e1:discover:email-hunter-verify` (catalog).
- **Planificare:** v2 §7 — `enrich-email-role-check` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Eticheta graf **nu** este o coadă separată în registry — dovadă în neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-role-check-family\``.
