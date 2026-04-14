# Sinapsă `document-email-send-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-email-send-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-email-send/document-email-send-channel-routing-decide.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-email-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-email-send` | **Registry:** `E3_DOCUMENT_EMAIL_SEND` → `document:email:send`. **Contract:** [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). |
| Destinație (graf) | `channel-routing-decide` | **Graf / Matrix / titlu neuron:** `channel:routing:decide` — [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). **Registry (execuție ADR-0001):** `E3_CHANNEL_ROUTE_DECIDE` → literal **`channel:route:decide`** (denumire diferită de câmpul v2; reconciliere documentată în contractul neuron și ADR familie `channels`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă traseul de **document email** de **decizia de rutare pe canal**. v2: **„sinapsă canonică de pipeline”**. În cod, J58 decide canalul (WA / EMAIL / PHONE / HITL) după context handover — fără ca exportul sinapsei să specifice cum se transmite starea de la I52 la J58.

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

- **Runtime (ADR-0001):** pentruțintă, coada executată este **`channel:route:decide`**, nu literalul `channel:routing:decide` din v2/Matrix — vezi contractul neuron.
- **Semantic (ADR-0002):** `e3:channel:route-decide` în catalog; fără intrare pentru string-ul `channel:routing:decide` (citire în contract neuron).
- **Planificare:** dependență declarativă între trimiterea documentului pe email și decizia de rutare canal.

## Limite și reconcilieri

- **Triplă denumire:** nod graf `channel-routing-decide` ↔ neuron v2 `channel:routing:decide` ↔ coadă BullMQ `channel:route:decide` — nu le confundați fără contractul neuron.
- Muchia nu dovedește că I52 enfilează direct J58; verificați lanțul real în workeri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-email-send-channel-routing-decide\``.
