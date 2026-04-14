# Sinapsă `document-whatsapp-send-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-whatsapp-send-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-whatsapp-send/document-whatsapp-send-channel-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-whatsapp-send` | **Matrix:** `document:whatsapp:send` (E3, `fiscal-docs`) → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Registry:** `E3_DOCUMENT_WHATSAPP_SEND` → `document:whatsapp:send`. |
| Destinație (graf) | `channel-email-send` | **Matrix:** `channel:email:send` (E3, `channels`) → [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). **Registry:** `E3_CHANNEL_EMAIL_SEND` → `channel:email:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în graf că trimiterea documentului pe WhatsApp (traseul `document-whatsapp-send`) este legată canonic de pasul **`channel-email-send`**. v2 confirmă doar **„sinapsă canonică de pipeline”**; nu precizează dacă este vorba de fallback canal, paralelism sau ordine strictă. Detaliile de rutare și payload sunt în contractele neuroni; muchia documentează **topologia planificată**.

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

- **Runtime (ADR-0001):** ambele capete au intrări `QUEUES` în `queue-registry.ts` — vezi registry și contractele citate.
- **Semantic (ADR-0002):** `e3:document:whatsapp-send` și intrarea catalog pentru canal e-mail — din `cognitive-node-catalog.ts` și contracte.
- **Planificare:** dependență `document-whatsapp-send` → `channel-email-send` în exportul de graf.

## Limite și reconcilieri

- Slug-uri graf (`kebab-case`) vs cozi cu `:` — reconciliere obligatorie prin Matrix, fără presupuneri despre conținutul mesajului muchiei.
- Starea stub I53 pentru sursă poate limita interpretarea „fluxului real” — vezi contractul sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-whatsapp-send-channel-email-send\``.
