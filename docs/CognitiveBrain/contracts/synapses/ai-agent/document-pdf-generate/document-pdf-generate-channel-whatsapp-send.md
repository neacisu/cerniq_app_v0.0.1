# Sinapsă `document-pdf-generate-channel-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-pdf-generate-channel-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-pdf-generate/document-pdf-generate-channel-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-pdf-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-pdf-generate` | **Registry:** `E3_DOCUMENT_PDF_GENERATE` → `document:pdf:generate`. **Contract:** [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). |
| Destinație (graf) | `channel-whatsapp-send` | **Registry:** `E3_CHANNEL_WHATSAPP_SEND` → `channel:whatsapp:send`. **Contract:** [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară ordonare canonică între **PDF fiscal** și **livrabile pe WhatsApp**. v2: **„sinapsă canonică de pipeline”**; fără detalii despre atașamente WA sau template-uri. Sens declarativ: documentul poate continua către canalul WA în pipeline-ul planificat.

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

- **Runtime (ADR-0001):** ambele în registry.
- **Semantic (ADR-0002):** fiscal-docs + channels — contracte separate.
- **Planificare:** dependență PDF → WA canal.

## Limite și reconcilieri

- Nu presupuneți enfileuire directă I51 → worker WA fără dovezi în cod.
- Slug-uri vs cozi — Matrix + registry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-pdf-generate-channel-whatsapp-send\``.
