# Sinapsă `guardrail-log-analyze-einvoice-archive-download`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-einvoice-archive-download` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-einvoice-archive-download.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** vezi contractul neuron. |
| Destinație (graf) | `einvoice-archive-download` | **Matrix:** `einvoice:archive:download` → [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). **Registry:** `einvoice:archive:download`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** leagă **`einvoice-archive-download`** de **`guardrail-log-analyze`** în planificare. v2: **„sinapsă canonică de pipeline”**; nu explică legătura cu SPV/arhivă. Nodul **destinație** este în registry; **sursa** necesită reconciliere graf ↔ cod.

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

- **Runtime (ADR-0001):** `E3_EINVOICE_ARCHIVE_DOWNLOAD` pentru destinație.
- **Semantic (ADR-0002):** `e3:einvoice:archive-download`.
- **Planificare:** dependență guardrail-log-analyze → arhivă e-Factură.

## Limite și reconcilieri

- Fără presupuneri despre fluxul ANAF; contract neuron destinație.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-einvoice-archive-download\``.
