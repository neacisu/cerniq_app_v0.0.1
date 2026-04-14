# Sinapsă `guardrail-log-analyze-document-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-document-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-document-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Gap runtime:** vezi contractul neuron. |
| Țintă | `document-whatsapp-send` | **Matrix:** `document:whatsapp:send` → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Registry:** `document:whatsapp:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează **`document-whatsapp-send`** în dependență canonică față de **`guardrail-log-analyze`**. v2: **„sinapsă canonică de pipeline”**. Nodul **țintă** include starea stub/payload documentată în contractul neuron; **sursa** are gap în registry — interpretarea end-to-end cere reconciliere explicită.

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

- **Runtime (ADR-0001):** `E3_DOCUMENT_WHATSAPP_SEND`. Sursa: fără `QUEUES` la audit (contract neuron).
- **Semantic (ADR-0002):** `e3:document:whatsapp-send`.
- **Planificare:** dependență structurală în graf.

## Limite și reconcilieri

- Stub I53 și producători J59 — vezi [`document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-document-whatsapp-send\``.
