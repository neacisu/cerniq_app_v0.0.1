# Sinapsă `document-whatsapp-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-whatsapp-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-whatsapp-send/document-whatsapp-send-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-whatsapp-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `document-whatsapp-send` | **Planificare:** nod de traseu în graf. **Matrix:** `document:whatsapp:send` (E3, `fiscal-docs`) → [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). **Runtime (ADR-0001):** `QUEUES.E3_DOCUMENT_WHATSAPP_SEND` → **`document:whatsapp:send`**. |
| ��intă | `e3-fiscal-docs` | Nod **agregat** de planificare pentru familia documentelor fiscale E3 în topologia exportată; nu este o singură coadă BullMQ și nu există un fișier `contracts/neurons/...` unic pentru această etichetă. Pentru neuroni concreți din `fiscal-docs`, vezi [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru etapă E3, coloana familie). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **default** leagă traseul `document-whatsapp-send` de agregatul `e3-fiscal-docs`. Descrierea confirmată în v2 este **„specializează familia”**: exportul indică o relație de specializare în familia de documente fiscale E3, **fără** payload, handler unic sau ordine de joburi. În repo, neuronul sursă I53 este documentat ca **stub** pentru trimitere WhatsApp reală, cu **decalaj de payload** față de enfileuirea din J59 — vezi contractul sursă; aceste detalii **nu** provin din câmpurile muchiei v2.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001, `workers/shared/src/queue-registry.ts`):** sursa executabilă pe **`document:whatsapp:send`** (constantă `E3_DOCUMENT_WHATSAPP_SEND`). Nodul **țintă** din graf (`e3-fiscal-docs`) nu este cheie în registry.
- **Semantic (ADR-0002, `packages/shared/src/cognitive-node-catalog.ts`):** `e3:document:whatsapp-send` — vezi contractul neuron; agregatul de graf se rezolvă prin familie, nu printr-un singur `nodeKey`.
- **Planificare:** muchie de specializare a familiei; nu implică automat același proces sau același mesaj de coadă pentru toți neuroni `fiscal-docs`.

## Limite și reconcilieri

- Stub I53 și diferențe de câmpuri față de J59 sunt **evidență din contractul neuron**, nu din registrul sinapsei.
- Nu inventa schemă payload, retry, safety sau telemetrie per-muchie acolo unde v2 marchează explicit absența din export.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — secțiunea **7. Complete synapse contract register**, bloc `SYNAPSE \`document-whatsapp-send-family\``.
