# Sinapsă `guardrail-discount-check-einvoice-archive-download`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-einvoice-archive-download` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-einvoice-archive-download.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `einvoice-archive-download` | **Matrix:** `einvoice:archive:download` → [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). **Registry:** `E3_EINVOICE_ARCHIVE_DOWNLOAD` → `einvoice:archive:download`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`einvoice-archive-download`** de **`guardrail-discount-check`** în graful planificat. v2: **„sinapsă canonică de pipeline”**; nu explică legătura de business între verificarea discount și arhiva e-Factura. Operațiile SPV/arhivă sunt în contractul neuron destinație.

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

- **Runtime (ADR-0001):** `guardrail:discount:check` și `einvoice:archive:download`.
- **Semantic (ADR-0002):** `e3:einvoice:archive-download` și guardrail discount — catalog + contracte.
- **Planificare:** dependență structurală în export.

## Limite și reconcilieri

- Fără completări despre fluxul ANAF/SPV; doar contract neuron destinație și cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-einvoice-archive-download\``.
