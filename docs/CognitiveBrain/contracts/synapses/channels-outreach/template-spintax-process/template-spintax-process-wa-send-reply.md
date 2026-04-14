# Sinapsă `template-spintax-process-wa-send-reply`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-wa-send-reply` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-wa-send-reply.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. |
| Destinație (graf) | `wa-send-reply` | **Contract:** [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md) (execuție E2); instanță v2 duplicată `E5/wa--send--reply.md` pentru etichetă graf — **runtime outreach:** enfileiere tipic pe **`q:wa:phone-NN:followup`**, nu literal `wa:send:reply`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Spintax** depinde în planificare de **răspunsul WhatsApp** (nod graf). v2: **„sinapsă canonică de pipeline”**; exportul nu descrie cum variabilele template intră în mesajul de răspuns.

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

- **Runtime (ADR-0001):** vezi [`../../../neurons/E2/wa--send--reply.md`](../../../neurons/E2/wa--send--reply.md) pentru cozi efective și AI span.
- **Semantic (ADR-0002):** mapare multi-span posibilă — contract neuron.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- **Nu** confunda cu `q:wa:reply` legacy — alt neuron și alt rol operațional.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-wa-send-reply\``.
