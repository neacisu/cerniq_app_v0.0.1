# Sinapsă `template-spintax-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `template-spintax-process` | Traseu în graf; [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process` (`QUEUES.TEMPLATE_SPINTAX_PROCESS`). **Semantic (ADR-0002):** `e2:template:spintax`. |
| Destinație (graf) | `e2-templates` | Nod agregat **familie templates** E2; nu este o singură coadă executabilă; vezi ADR / catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **procesare spintax pe șabloane** sub agregatul **`e2-templates`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; `processSpintax` și logging sunt în contractul neuron și `templates.ts`, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`template-spintax-process-q-wa-phone.md`](template-spintax-process-q-wa-phone.md), [`template-spintax-process-q-wa-phone-01.md`](template-spintax-process-q-wa-phone-01.md), [`template-spintax-process-q-wa-phone-02.md`](template-spintax-process-q-wa-phone-02.md), [`template-spintax-process-q-wa-phone-20.md`](template-spintax-process-q-wa-phone-20.md), [`template-spintax-process-q-wa-phone-xx.md`](template-spintax-process-q-wa-phone-xx.md), [`template-spintax-process-q-wa-reply.md`](template-spintax-process-q-wa-reply.md), [`template-spintax-process-wa-chat-history-fetch.md`](template-spintax-process-wa-chat-history-fetch.md), [`template-spintax-process-wa-media-send.md`](template-spintax-process-wa-media-send.md), [`template-spintax-process-wa-message-retry.md`](template-spintax-process-wa-message-retry.md), [`template-spintax-process-wa-send-followup.md`](template-spintax-process-wa-send-followup.md), [`template-spintax-process-wa-send-initial.md`](template-spintax-process-wa-send-initial.md), [`template-spintax-process-wa-send-reply.md`](template-spintax-process-wa-send-reply.md), [`template-spintax-process-wa-status-sync.md`](template-spintax-process-wa-status-sync.md).

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

- **Runtime (ADR-0001):** `e2-templates` nu este cheie în `QUEUES`; execuția spintax este `template:spintax:process`.
- **Semantic (ADR-0002):** `e2:template:spintax`.
- **Planificare:** v2 §7 — `template-spintax-process` → `e2-templates`.

## Limite și reconcilieri

- Dependențele către cozi WA din același folder exprimă **planificarea** din v2; execuția reală folosește adesea `q:wa:phone-NN`, `:followup` sau cozi auxiliare — vezi contractele neuron țintă.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-family\``.
