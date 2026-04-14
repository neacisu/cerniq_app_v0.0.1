# Sinapsă `guardrail-stock-verify-document-pdf-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-verify-document-pdf-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-verify/guardrail-stock-verify-document-pdf-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-verify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-stock-verify` | **Gap runtime (documentat):** coada **`guardrail:stock:verify`** nu apare în `workers/shared/src/queue-registry.ts`; vezi [`../../../neurons/E3/guardrail--stock--verify.md`](../../../neurons/E3/guardrail--stock--verify.md). Rând [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv): `queue_in_registry` = `no`. |
| Destinație (graf) | `document-pdf-generate` | Coadă executabilă **`document:pdf:generate`** (`QUEUES.E3_DOCUMENT_PDF_GENERATE`) — [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

**Dependency** în planificare: generarea PDF este plasată după (dependentă de) guardrail-ul de stoc în topologia exportată. Mecanismul runtime între cozi nu face obiectul câmpurilor v2 §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursa **`guardrail:stock:verify`** nu are constantă în `QUEUES`; `E3_DOCUMENT_PDF_GENERATE`.
- **Semantic (ADR-0002):** destinație (neuron) — `e3:document:pdf-generate` / `document:pdf:generate` — „Generare PDF ofertă/proformă/factură din template Handlebars…” (~L1965–1971), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 pentru `guardrail-stock-verify-document-pdf-generate`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `guardrail:stock:verify` (`queue_in_registry` = `no`); coada destinație `queue_in_registry` = `yes`.

## Limite și reconcilieri

- Fără presupuneri despre conținutul PDF sau momentul exact al generării față de guardrail.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-verify-document-pdf-generate\``.
