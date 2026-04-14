# Sinapsă `enrich-ai-contact-parse-silver-dedup-fuzzy-match`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-ai-contact-parse-silver-dedup-fuzzy-match` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-ai-contact-parse/enrich-ai-contact-parse-silver-dedup-fuzzy-match.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-ai-contact-parse` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `enrich-ai-contact-parse` | **Contract:** [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **Runtime (ADR-0001):** v2 `enrich:ai:contact-parse` fără coadă literală în registry — vezi contract și ADR ai-enrichment. |
| Destinație (graf) | `silver-dedup-fuzzy-match` | **Contract (neuron):** [`../../../neurons/E1/silver--dedup--fuzzy-match.md`](../../../neurons/E1/silver--dedup--fuzzy-match.md). **Traseu sinapse:** [`../silver-dedup-fuzzy-match/`](../silver-dedup-fuzzy-match/). **Runtime:** vezi neuron (`dedup:fuzzy` în registry, dacă este cazul în contract). **ADR:** [`../../../adr/families/e1/dedup.md`](../../../adr/families/e1/dedup.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Traseul **enrich-ai-contact-parse** depinde în planificare de **deduplicare fuzzy** silver (`silver-dedup-fuzzy-match`). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie praguri de similaritate sau câmpuri comparate.

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

- **Runtime (ADR-0001):** vezi contracte sursă și țintă pentru mapare `silver:dedup:*` vs `dedup:*`.
- **Semantic (ADR-0002):** AI enrichment (graf) ↔ dedup fuzzy E1.
- **Planificare:** v2 §7 — `enrich-ai-contact-parse` → `silver-dedup-fuzzy-match`.

## Limite și reconcilieri

- Politica de fuzzy matching și impactul asupra CRM sunt în contract neuron țintă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-ai-contact-parse-silver-dedup-fuzzy-match\``.
