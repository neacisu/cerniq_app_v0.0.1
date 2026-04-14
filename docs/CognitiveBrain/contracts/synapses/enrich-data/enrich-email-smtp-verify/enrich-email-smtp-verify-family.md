# Sinapsă `enrich-email-smtp-verify-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-smtp-verify-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-smtp-verify/enrich-email-smtp-verify-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-smtp-verify` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-email-smtp-verify` | Traseu în graf; contract neuron: [`../../../neurons/E1/enrich--email--smtp-verify.md`](../../../neurons/E1/enrich--email--smtp-verify.md). **v2_queue:** `enrich:email:smtp-verify`. **Runtime (ADR-0001):** fără coadă dedicată; câmpuri **SMTP** din **Hunter email-verifier** pe **`discover:email:hunter-verify`** — vezi neuron. **`NEURON_MATRIX.csv`:** `queue_in_registry` = **no** pentru acest `v2_queue` (coloana marchează alinierea cozii cu registry). |
| Destinație (graf) | `e1-enrichment` | Agregat familie **enrichment** E1. [`../../../adr/families/e1/enrichment.md`](../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **verificare SMTP email** (`enrich-email-smtp-verify`) sub **`e1-enrichment`**. v2: **„specializează familia”**. Câmpurile `smtp_check` / `smtp_server` și logarea în `silverEnrichmentLog` sunt în contractul neuron.

## Sinapse dependență în același traseu

[`enrich-email-smtp-verify-enrich-ai-contact-parse.md`](enrich-email-smtp-verify-enrich-ai-contact-parse.md), [`enrich-email-smtp-verify-enrich-ai-industry-classify.md`](enrich-email-smtp-verify-enrich-ai-industry-classify.md), [`enrich-email-smtp-verify-enrich-ai-text-structure.md`](enrich-email-smtp-verify-enrich-ai-text-structure.md).

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
- **Planificare:** v2 §7 — `enrich-email-smtp-verify` → `e1-enrichment`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Matrice:** `catalog_nodekey_parsed` poate indica `e1:discover:email-hunter-verify`, dar `queue_in_registry` = **no** — tensiune documentată în matrice, nu rezolvată de sinapsă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-smtp-verify-family\``.
