# Sinapsă `document-email-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-email-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-email-send/document-email-send-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `document-email-send` | Traseu în graf; **runtime:** coadă canonică **`document:email:send`** — [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md); **Registry:** `E3_DOCUMENT_EMAIL_SEND` (`workers/shared/src/queue-registry.ts`). |
| Destinație (graf) | `e3-fiscal-docs` | Agregat de planificare pentru familia **fiscal-docs** (E3), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `document-email-send` în nucleul **`e3-fiscal-docs`** din export. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`document-email-send-channel-email-send.md`](document-email-send-channel-email-send.md), [`document-email-send-channel-routing-decide.md`](document-email-send-channel-routing-decide.md), [`document-email-send-channel-whatsapp-send.md`](document-email-send-channel-whatsapp-send.md) — muchii **dependency** către neuroni de canal (v2 §7).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** sursa executabilă ca **`document:email:send`** — vezi registry și contractul I52.
- **Semantic (ADR-0002):** `e3:document:email-send` / `document:email:send` (vezi `cognitive-node-catalog.ts` în contractul neuron); **`e3-fiscal-docs`** rămâne agregat de plan.
- **Planificare:** specializare de familie; nu implică automat toate cozile din swimlane într-un singur job.

## Limite și reconcilieri

- Slug graf `document-email-send` vs coadă `document:email:send` — mapare explicită; pentru execuție prevală registry-ul.
- Nu inventa schemă payload / retry / safety / telemetrie dincolo de câmpurile sinapsei din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-email-send-family\``.
