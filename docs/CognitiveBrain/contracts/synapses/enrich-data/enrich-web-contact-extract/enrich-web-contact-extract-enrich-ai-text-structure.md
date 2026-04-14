# Sinapsă `enrich-web-contact-extract-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-contact-extract-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-contact-extract/enrich-web-contact-extract-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-contact-extract` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-web-contact-extract` | **Contract:** [`../../../neurons/E1/enrich--web--contact-extract.md`](../../../neurons/E1/enrich--web--contact-extract.md). **Runtime (ADR-0001):** v2 `enrich:web:contact-extract` ↔ **`scrape:website:contact-page`** — vezi neuron; **fără** literal `enrich:web:contact-extract` în registry. |
| Destinație (graf) | `enrich-ai-text-structure` | **Contract:** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). Prefix graf vs cozi **`ai:*`** — vezi [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **enrich-web-contact-extract** are dependență sintactică față de nodul **enrich-ai-text-structure**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `enrich-web-contact-extract` → `enrich-ai-text-structure`.
- **Runtime (ADR-0001):** sursă — vezi maparea scrape în neuron; ținta AI — vezi neuronul țintă.
- **Semantic (ADR-0002):** E1 — vezi ADR `enrichment` și `ai-enrichment`.

## Limite și reconcilieri

- **Sursă:** reconciliere obligatorie între nodul graf și cozile scrape — vezi neuron.
- Capetele cu prefixe diferite nu sunt echivalate automat de export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-contact-extract-enrich-ai-text-structure\``.
