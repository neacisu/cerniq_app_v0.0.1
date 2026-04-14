# Sinapsă `email-cold-campaign-pause-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-campaign-pause-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-campaign-pause/email-cold-campaign-pause-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-campaign-pause` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-campaign-pause` | Traseu în graf; **runtime:** coadă canonică **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE` (`workers/shared/src/queue-registry.ts`). |
| Destinație (graf) | `e2-email-cold` | Agregat de planificare pentru familia **email-cold** (E2), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `email-cold-campaign-pause` în nucleul **`e2-email-cold`** din export. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`email-cold-campaign-pause-email-warm-document.md`](email-cold-campaign-pause-email-warm-document.md), [`email-cold-campaign-pause-email-warm-proforma.md`](email-cold-campaign-pause-email-warm-proforma.md), [`email-cold-campaign-pause-email-warm-send.md`](email-cold-campaign-pause-email-warm-send.md) — muchii **dependency** către traseele warm din graf (v2 §7).

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

- **Runtime (ADR-0001):** execuție pe **`email:cold:campaign:pause`** — vezi registry și contractul E2.
- **Semantic (ADR-0002):** `e2:email:cold-campaign-pause` (catalog / `NEURON_MATRIX.csv`); **`e2-email-cold`** rămâne agregat de plan.
- **Planificare:** muchie de familie; nu echivalează cu enumerarea tuturor cozilor din swimlane într-un singur job.

## Limite și reconcilieri

- Slug graf `email-cold-campaign-pause` vs coadă `email:cold:campaign:pause` — mapare explicită; pentru execuție prevală registry-ul.
- Comportamentul workerului (ex. Instantly pause) este în contractul neuron, nu dedus din exportul muchiei de familie.
- Nu inventa schemă payload / retry / safety / telemetrie dincolo de câmpurile sinapsei din v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-campaign-pause-family\``.
