# Sinapsă `enrich-email-mx-check-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-mx-check-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-mx-check/enrich-email-mx-check-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-mx-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-email-mx-check` | **v2:** `enrich:email:mx-check`. **Execuție:** **fără** coadă dedicată în registry la audit — [`../../../neurons/E1/enrich--email--mx-check.md`](../../../neurons/E1/enrich--email--mx-check.md); semnale MX în **`discover:email:hunter-verify`** / **`discover:email:zerobounce`**. |
| Destinație (graf) | `enrich-ai-contact-parse` | **v2:** `enrich:ai:contact-parse`. **Contract:** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **ADR:** [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf ordonare canonică între **MX-check (plan)** și **neuronul AI contact-parse**. v2: **„sinapsă canonică de pipeline”**. Cum anume se propagă informația MX spre ramura AI **nu** este în câmpurile registrului sinapsei.

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

- **Runtime:** sursă — gap documentat; țintă — ADR ai-enrichment + `ai:structure:xai` ca apropiere în neuron.
- **Planificare:** topologie v2 §7.

## Limite și reconcilieri

- **Dublă reconciliere:** traseu graf `enrich-email-mx-check` vs cozi G2 cu câmpuri MX — vezi neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-mx-check-enrich-ai-contact-parse\``.
