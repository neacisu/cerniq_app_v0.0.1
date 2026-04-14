# Sinapsă `enrich-ai-contact-parse-silver-dedup-entity-resolve`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-contact-parse-silver-dedup-entity-resolve` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-contact-parse/enrich-ai-contact-parse-silver-dedup-entity-resolve.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-contact-parse` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-ai-contact-parse` | **Contract:** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **Runtime (ADR-0001):** v2 `enrich:ai:contact-parse` fără coadă literală în registry — vezi contract și [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |
| Destinație (graf) | `silver-dedup-entity-resolve` | **Contract (neuron):** [`../../../neurons/E1/silver--dedup--entity-resolve.md`](../../../neurons/E1/silver--dedup--entity-resolve.md). **Traseu sinapse:** [`../silver-dedup-entity-resolve/`](../silver-dedup-entity-resolve/). **Runtime:** v2 `silver:dedup:entity-resolve` fără literal în registry — echivalențe discutate în contract (ex. `dedup:exact`). **ADR:** [`../../../adr/families/e1/dedup.md`](../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **enrich-ai-contact-parse** depinde în planificare de **rezoluție entitate / deduplicare** (`silver-dedup-entity-resolve`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie chei de potrivire sau fuziune înregistrări.

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

- **Runtime (ADR-0001):** ambele capete au **decalaj** între etichete v2 și cozi `ai:*` / `dedup:*` — vezi contracte.
- **Semantic (ADR-0002):** AI enrichment (graf) ↔ dedup silver E1.
- **Planificare:** v2 §7 — `enrich-ai-contact-parse` → `silver-dedup-entity-resolve`.

## Limite și reconcilieri

- Nu confunda „entity-resolve” din graf cu o coadă omologă în registry — dovadă în contractul destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-contact-parse-silver-dedup-entity-resolve\``.
