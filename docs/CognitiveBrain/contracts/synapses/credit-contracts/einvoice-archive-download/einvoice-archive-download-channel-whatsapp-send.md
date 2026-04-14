# Sinapsă `einvoice-archive-download-channel-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `einvoice-archive-download-channel-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/einvoice-archive-download/einvoice-archive-download-channel-whatsapp-send.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `einvoice-archive-download` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `einvoice-archive-download` | **Registry (ADR-0001):** `QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD` → **`einvoice:archive:download`**. **Contract:** [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). |
| Destinație (graf) | `channel-whatsapp-send` | **Registry:** `QUEUES.E3_CHANNEL_WHATSAPP_SEND` → **`channel:whatsapp:send`**. **Contract:** [`../../../neurons/E3/channel--whatsapp--send.md`](../../../neurons/E3/channel--whatsapp--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că fluxul **einvoice-archive-download** este ordonat canonic față de **trimiterea pe WhatsApp** (`channel-whatsapp-send`). v2: **„sinapsă canonică de pipeline”** — fără encoding al payload-ului sau al ordinii efective de joburi în registrul sinapsei.

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

- **Runtime (ADR-0001):** `einvoice:archive:download` și `channel:whatsapp:send` în `queue-registry.ts`.
- **Semantic (ADR-0002):** `e3:einvoice:archive-download` vs `e3:channel:whatsapp-send` — vezi catalog.
- **Planificare:** dependență fiscal-docs → channels.

## Limite și reconcilieri

- Nu confundați **`channel:whatsapp:send`** cu **`document:whatsapp:send`** (alt neuron E3).
- Fără presupuneri despre conținutul mesajului sau atașamentele propagate pe muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`einvoice-archive-download-channel-whatsapp-send\``.
