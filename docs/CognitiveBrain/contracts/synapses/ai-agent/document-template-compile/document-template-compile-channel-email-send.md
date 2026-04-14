# Sinapsă `document-template-compile-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-template-compile-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-template-compile/document-template-compile-channel-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-template-compile` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-template-compile` | **Registry:** `E3_DOCUMENT_TEMPLATE_COMPILE` → `document:template:compile`. **Contract:** [`../../../neurons/E3/document--template--compile.md`](../../../neurons/E3/document--template--compile.md). |
| Destinație (graf) | `channel-email-send` | **Registry:** `E3_CHANNEL_EMAIL_SEND` → `channel:email:send`. **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența plasează **compilarea template-ului** (HTML determinist) în raport canonic cu **email pe canal**. v2: **„sinapsă canonică de pipeline”**. În lanțul fiscal, conținutul compilat poate alimenta sau precede livrarea pe email — sens declarativ; exportul nu codifică câmpuri de mesaj.

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

- **Runtime (ADR-0001):** ambele cozi în registry.
- **Semantic (ADR-0002):** fiscal-docs vs channels.
- **Planificare:** template compile → canal email.

## Limite și reconcilieri

- I54 produce HTML; I52 email poate folosi PDF din alt lanț (Oblio) — nu echivalați automat toate căile fără cod.
- Fără presupuneri despre payload între cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-template-compile-channel-email-send\``.
