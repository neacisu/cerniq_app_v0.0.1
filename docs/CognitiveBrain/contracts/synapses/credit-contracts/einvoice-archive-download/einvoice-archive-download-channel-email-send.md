# Sinapsă `einvoice-archive-download-channel-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `einvoice-archive-download-channel-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/einvoice-archive-download/einvoice-archive-download-channel-email-send.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `einvoice-archive-download` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `einvoice-archive-download` | **Registry (ADR-0001):** `QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD` → **`einvoice:archive:download`**. **Contract:** [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). |
| Destinație (graf) | `channel-email-send` | **Registry:** `QUEUES.E3_CHANNEL_EMAIL_SEND` → **`channel:email:send`**. **Contract:** [`../../../neurons/E3/channel--email--send.md`](../../../neurons/E3/channel--email--send.md). **Familie v2:** `channels` (vs sursă `fiscal-docs`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că fluxul de **descărcare arhivă e-Factura** (`einvoice-archive-download`) este ordonat canonic față de neuronul generic de **email canal** (`channel-email-send`). v2 descrie sinapsa ca **„sinapsă canonică de pipeline”** — fără detalii despre payload, idempotență sau lanțul efectiv între workerul de arhivă și canal; acestea țin de contractele neuron și cod, nu de registrul sinapsei.

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

- **Runtime (ADR-0001):** ambele cozi apar în `queue-registry.ts` — constantele `E3_EINVOICE_ARCHIVE_DOWNLOAD` și `E3_CHANNEL_EMAIL_SEND`.
- **Semantic (ADR-0002):** `e3:einvoice:archive-download` vs `e3:channel:email-send` — catalog + contracte neuron.
- **Planificare:** dependență declarativă fiscal-docs → channels în topologia exportată.

## Limite și reconcilieri

- **Familii diferite** (fiscal-docs → channels): muchia este topologie planificată; enfileuirea reală poate include pași intermediari — verificați workerii, nu doar graful.
- Fără presupuneri despre payload pe muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`einvoice-archive-download-channel-email-send\``.
