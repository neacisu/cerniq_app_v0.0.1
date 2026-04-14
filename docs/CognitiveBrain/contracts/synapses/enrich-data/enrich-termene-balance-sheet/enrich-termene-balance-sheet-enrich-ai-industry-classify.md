# Sinapsă `enrich-termene-balance-sheet-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-balance-sheet-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-balance-sheet/enrich-termene-balance-sheet-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-balance-sheet` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-termene-balance-sheet` | **Contract:** [`../../../neurons/E1/enrich--termene--balance-sheet.md`](../../../neurons/E1/enrich--termene--balance-sheet.md). **Runtime (ADR-0001):** **`enrich:termene:balance`** — vezi neuron. |
| Destinație (graf) | `enrich-ai-industry-classify` | **Contract:** [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). Prefix graf vs cozi **`ai:*`** — vezi [`../../../../adr/families/e1/ai-enrichment.md`](../../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **enrich-termene-balance-sheet** are dependență sintactică față de nodul **enrich-ai-industry-classify**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `enrich-termene-balance-sheet` → `enrich-ai-industry-classify`.
- **Runtime (ADR-0001):** sursă — vezi neuron; ținta AI — vezi neuronul țintă.
- **Semantic (ADR-0002):** E1 — vezi ADR `enrichment` și `ai-enrichment`.

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pentru sursă (`balance-sheet` vs `balance`) și pentru prefixe (`enrich:termene:*` vs `ai:*`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-balance-sheet-enrich-ai-industry-classify\``.
