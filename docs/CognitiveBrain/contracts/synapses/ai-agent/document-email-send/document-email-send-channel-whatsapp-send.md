# Sinapsă `document-email-send-channel-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-email-send-channel-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-email-send/document-email-send-channel-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-email-send` | **Registry:** `E3_DOCUMENT_EMAIL_SEND` → `document:email:send`. **Contract:** [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). |
| Destinație (graf) | `channel-whatsapp-send` | **Registry:** `E3_CHANNEL_WHATSAPP_SEND` → `channel:whatsapp:send`. **Contract:** [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența plasează traseul **document-email** în raport canonic cu **trimiterea WhatsApp pe canal**. v2: **„sinapsă canonică de pipeline”** — fără descriere a conținutului mesajului sau a atașamentelor între cele două lumi (fiscal-docs vs channels). Interpretare business declarativă: livrarea multi-canal poate include, în planificare, și calea WA după sau alături de email document.

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

- **Runtime (ADR-0001):** ambele cozi în registry — vezi constantele din contractele neuron.
- **Semantic (ADR-0002):** familii și `nodeKey` distincte; consultați catalogul citat în contracte.
- **Planificare:** dependență declarativă document-email → canal WhatsApp.

## Limite și reconcilieri

- Nu presupuneți că același job I52 alimentează direct workerul WA; confirmați fluxul în cod.
- Slug-uri graf vs cozi `:` — mapare prin Matrix + registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-email-send-channel-whatsapp-send\``.
