# Sinapsă `wa-send-reply-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-reply-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-reply/wa-send-reply-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-reply` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md). **Runtime (ADR-0001):** în v2/cod, trimiterea reply WA nu folosește o coadă dedicată `wa:send:reply` în registry — vezi contract neuron (lanț `ai:response:generate` → cozi `:followup` per telefon). |
| Destinație (graf) | `e2-whatsapp` | **Nod agregat:** familia **whatsapp** E2 în planificare; nu este o singură coadă executabilă. **ADR:** [`../../../../adr/families/e2/whatsapp.md`](../../../../adr/families/e2/whatsapp.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **`wa-send-reply`** sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”** — fără payload/retry/safety în câmpurile exportului sinapsei.

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

- **Runtime:** `e2-whatsapp` nu este cheie în `QUEUES`; execuția efectivă este pe cozi WA/outreach — contract sursă.
- **Semantic (ADR-0002):** `e2:wa:send-reply` (etichetă catalog) vs realitatea cozilor — vezi neuron.
- **Planificare:** v2 §7 — `wa-send-reply` → `e2-whatsapp`.

## Limite și reconcilieri

- **Slug graf `wa-send-reply` vs BullMQ:** reconcilierea este obligatorie înainte de a presupune o coadă cu același nume.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-reply-family\``.
