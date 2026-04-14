# Sinapsă `document-pdf-generate-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-pdf-generate-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-pdf-generate/document-pdf-generate-channel-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-pdf-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-pdf-generate` | **Registry:** `E3_DOCUMENT_PDF_GENERATE` → `document:pdf:generate`. **Contract:** [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md) (PDF prin Oblio fetch). |
| Destinație (graf) | `channel-email-send` | **Registry:** `E3_CHANNEL_EMAIL_SEND` → `channel:email:send`. **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, **generarea/obținerea PDF-ului fiscal** este legată canonic de **trimiterea pe email la nivel de canal**. v2: **„sinapsă canonică de pipeline”**. Contractul I51 menționează downstream către I52 email — aceasta este **dovadă de cod**, nu câmp în sinapsa v2; sinapsa rămâne export-grounded generic.

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
- **Semantic (ADR-0002):** fiscal-docs vs channels — vezi contracte.
- **Planificare:** dependență declarativă PDF → email canal.

## Limite și reconcilieri

- Lanțul I51→I52 este indicat în contractul I51; nu îl confundați cu obligația grafului de a reproduce același tip de mesaj pe muchia către `channel-email-send` (nod generic canal).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-pdf-generate-channel-email-send\``.
