# Sinapsă `guardrail-discount-check-document-pdf-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-document-pdf-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-document-pdf-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `document-pdf-generate` | **Matrix:** `document:pdf:generate` → [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). **Registry:** `E3_DOCUMENT_PDF_GENERATE` → `document:pdf:generate`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`document-pdf-generate`** de traseul **`guardrail-discount-check`** în planificare. v2 oferă doar **„sinapsă canonică de pipeline”**; nu precizează dacă PDF-ul este generat numai după guardrail sau în paralel. Detalii în contractele neuroni `fiscal-docs` și `guardrails`.

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

- **Runtime (ADR-0001):** `E3_GUARDRAIL_DISCOUNT_CHECK` și `E3_DOCUMENT_PDF_GENERATE`.
- **Semantic (ADR-0002):** catalog + contracte pentru ambele capete.
- **Planificare:** dependență declarată între verificarea discount și generarea PDF.

## Limite și reconcilieri

- Export-grounded: fără completări despre payload sau idempotență muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-document-pdf-generate\``.
