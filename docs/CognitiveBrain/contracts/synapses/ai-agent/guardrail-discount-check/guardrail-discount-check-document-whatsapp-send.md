# Sinapsă `guardrail-discount-check-document-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-document-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-document-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `document-whatsapp-send` | **Matrix:** `document:whatsapp:send` → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Registry:** `document:whatsapp:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează traseul/nodul planificat **`document-whatsapp-send`** în dependență față de **`guardrail-discount-check`**. v2: **„sinapsă canonică de pipeline”**. În repo, trimiterea document WhatsApp este documentată ca **stub** cu posibile decalaje de payload — vezi contractul destinație; muchia nu afirmă că guardrail-ul „aprobă” efectiv trimiterea.

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

- **Runtime (ADR-0001):** `E3_GUARDRAIL_DISCOUNT_CHECK` și `E3_DOCUMENT_WHATSAPP_SEND`.
- **Semantic (ADR-0002):** contracte `guardrail--discount--check` și `document--whatsapp--send`.
- **Planificare:** dependență guardrail discount → flux document WhatsApp.

## Limite și reconcilieri

- Starea stub I53 și producători alternativi (ex. J59) — vezi contractul `document--whatsapp--send.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-document-whatsapp-send\``.
