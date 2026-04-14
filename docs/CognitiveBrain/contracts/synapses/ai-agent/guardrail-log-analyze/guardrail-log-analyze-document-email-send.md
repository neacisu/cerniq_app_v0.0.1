# Sinapsă `guardrail-log-analyze-document-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-log-analyze-document-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-log-analyze/guardrail-log-analyze-document-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-log-analyze` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-log-analyze` | **Matrix:** `guardrail:log:analyze` → [`../../../neurons/E3/guardrail--log--analyze.md`](../../../neurons/E3/guardrail--log--analyze.md). **Reconciliere:** contractul neuron marchează **gap runtime** (lipsă din `queue-registry.ts` la audit); muchia exprimă **planificare**, nu execuție confirmată pe această coadă. |
| Țintă | `document-email-send` | **Matrix:** `document:email:send` → [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). **Registry:** `document:email:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în graf că **`document-email-send`** depinde canonic de traseul **`guardrail-log-analyze`**. v2: **„sinapsă canonică de pipeline”**; nu descrie cum analiza logurilor precede sau validează trimiterea e-mail. Nodul **țintă** este executabil în registry; **sursa** rămâne supusă gap-ului documentat în contractul neuron.

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

- **Runtime (ADR-0001):** ținta **`document:email:send`** — `E3_DOCUMENT_EMAIL_SEND`. Sursa: vezi gap în contractul neuron.
- **Semantic (ADR-0002):** `e3:document:email-send`; sursă — fără potrivire catalog completă la audit (contract neuron).
- **Planificare:** dependență structurală guardrail-log-analyze → document e-mail.

## Limite și reconcilieri

- **Asimetrie runtime:** capăt țintă confirmat în registry vs sursă ne-reconciliată — nu se echivalează automat cu lanț BullMQ real.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-log-analyze-document-email-send\``.
