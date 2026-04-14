# Sinapsă `enrich-web-tech-detect-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-web-tech-detect-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-web-tech-detect/enrich-web-tech-detect-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-web-tech-detect` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-web-tech-detect` | **Contract:** [`../../../neurons/E1/enrich--web--tech-detect.md`](../../../neurons/E1/enrich--web--tech-detect.md). **Runtime (ADR-0001):** v2 `enrich:web:tech-detect` — **gap** coadă în registry; vezi neuron. |
| Destinație (graf) | `enrich-ai-text-structure` | **Contract:** [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). Prefix graf vs cozi **`enrich:ai:*`** — vezi [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **enrich-web-tech-detect** are dependență sintactică față de nodul **enrich-ai-text-structure**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `enrich-web-tech-detect` → `enrich-ai-text-structure`.
- **Runtime (ADR-0001):** sursă cu **gap** documentat; ținta AI — vezi [`enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md).
- **Semantic (ADR-0002):** E1 — vezi ADR `enrichment` și `ai-enrichment`.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe capătul sursă (web tech-detect: fără coadă canonică demonstrată în registry la auditul neuronului).
- Capetele cu familii diferite (`enrich:web:*` vs `enrich:ai:*`) nu sunt echivalate automat de export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-web-tech-detect-enrich-ai-text-structure\``.
