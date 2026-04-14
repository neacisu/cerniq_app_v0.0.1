# Sinapsă `enrich-email-mx-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-email-mx-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-email-mx-check/enrich-email-mx-check-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-email-mx-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-email-mx-check` | **v2 / Matrix:** `enrich:email:mx-check`. **Contract:** [`../../../neurons/E1/enrich--email--mx-check.md`](../../../neurons/E1/enrich--email--mx-check.md). **Limită dovedită (audit neuron):** **nu** există la data auditului procesor BullMQ sau intrare în `queue-registry.ts` cu acest nume literal; semnale MX apar în răspunsurile integrărilor **`discover:email:hunter-verify`** și **`discover:email:zerobounce`** — vezi contract neuron; **nu** inferați o coadă executabilă `enrich:email:mx-check` din graf singur. |
| Destinație (graf) | `e1-enrichment` | Agregat **enrichment** E1. **ADR:** [`../../../../adr/families/e1/enrichment.md`](../../../../adr/families/e1/enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **verificare MX (etichetă graf)** sub **`e1-enrichment`**. v2: **„specializează familia”**. Execuția efectivă legată de MX este **fragmentată** în alte cozi (G2) — registrul sinapsei nu o descrie; contractul neuron documentează gap-ul.

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

- **Runtime (ADR-0001):** **necesită reconciliere graf ↔ registry** pentru sursă — fără coadă dedicată `enrich:email:mx-check` în registry la audit.
- **Semantic:** fără `nodeKey` catalog pentru `enrich:email:mx-check` literal — vezi neuron.
- **Planificare:** traseu → `e1-enrichment` conform v2 §7.

## Limite și reconcilieri

- **Gap major:** planificarea folosește un traseu dedicat MX; codul expune MX ca câmp în fluxuri Hunter/ZeroBounce — vezi [`enrich--email--mx-check.md`](../../../neurons/E1/enrich--email--mx-check.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-email-mx-check-family\``.
