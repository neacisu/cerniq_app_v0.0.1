# Sinapsă `enrich-web-fetch-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-fetch-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-fetch/enrich-web-fetch-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-fetch` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-web-fetch` | **Contract:** [`../../../neurons/E1/enrich--web--fetch.md`](../../../neurons/E1/enrich--web--fetch.md). **Runtime (ADR-0001):** v2 `enrich:web:fetch` **fără** coadă dedicată 1:1 — vezi neuron; dovezi parțiale în **`e1:scrape:website-finder`** / **`e1:scrape:website-contact`**. |
| Destinație (graf) | `enrich-ai-text-structure` | **Contract:** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). Prefix graf vs cozi **`ai:*`** — vezi [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **enrich-web-fetch** are dependență sintactică față de nodul **enrich-ai-text-structure**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `enrich-web-fetch` → `enrich-ai-text-structure`.
- **Runtime (ADR-0001):** sursă — gap documentat în neuron; ținta AI — vezi neuronul țintă.
- **Semantic (ADR-0002):** E1 — vezi ADR `enrichment` și `ai-enrichment`.

## Limite și reconcilieri

- **Sursă:** **necesită reconciliere graf ↔ registry** — fără presupuneri despre o singură coadă executabilă.
- Capetele cu prefixe diferite nu sunt echivalate automat de export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-fetch-enrich-ai-text-structure\``.
