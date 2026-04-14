# Sinapsă `document-email-send-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-email-send-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-email-send/document-email-send-channel-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-email-send` | **Registry:** `E3_DOCUMENT_EMAIL_SEND` → `document:email:send`. **Contract:** [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |
| Destinație (graf) | `channel-email-send` | **Registry:** `E3_CHANNEL_EMAIL_SEND` → `channel:email:send`. **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). **Familie v2:** `channels` (vs sursă `fiscal-docs`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că fluxul de **trimitere document prin email** (`document-email-send`) este ordonat canonic față de neuronul generic de **email canal** (`channel-email-send`). v2 descrie sinapsa ca **„sinapsă canonică de pipeline”** — fără detalii despre cum se propagă PDF-ul, thread-ul sau idempotența între I52 și canalul de outreach; acesteațin de contractele neuron și cod, nu de registrul sinapsei.

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

- **Runtime (ADR-0001):** ambele cozi apar în `queue-registry.ts` la liniile citite în contractele neuron.
- **Semantic (ADR-0002):** `nodeKey` distincte — fiscal-docs vs channels; vezi catalog în fiecare contract neuron.
- **Planificare:** dependență declarativă între traseul document-email și trimiterea pe canal email.

## Limite și reconcilieri

- **Familii diferite** (fiscal-docs → channels): muchia este topologie planificată; rutarea efectivă poate include pași intermediari — verificați workerii și enfileuirea reală, nu doar graful.
- Fără presupuneri despre payload pe muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-email-send-channel-email-send\``.
