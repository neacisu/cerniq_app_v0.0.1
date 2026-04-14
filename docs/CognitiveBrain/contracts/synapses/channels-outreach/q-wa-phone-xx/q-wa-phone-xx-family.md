# Sinapsă `q-wa-phone-xx-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `q-wa-phone-xx-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/q-wa-phone-xx/q-wa-phone-xx-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `q-wa-phone-xx` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `q-wa-phone-xx` | Traseu în graf — **placeholder generic** `XX` pentru index linie WA; [`../../../neurons/E2/q--wa--phone_xx.md`](../../../neurons/E2/q--wa--phone_xx.md). **Runtime (ADR-0001):** cozi concrete `q:wa:phone-01` … `q:wa:phone-20` și `:followup` (`getWaPhoneQueueName` / `getWaPhoneFollowupQueueName`, `workers/shared/src/queue-registry.ts`) — **nu** literal `q-wa-phone-xx` ca nume Redis. **Semantic (ADR-0002):** pattern catalog `q:wa:phone-{01..20}` — vezi contract neuron. |
| Destinație (graf) | `e2-whatsapp` | Nod agregat **familie WhatsApp** E2 în planificare; nu este o singură coadă executabilă; vezi ADR / catalog. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **cozi WA per-linie (generic `XX`)** sub agregatul **`e2-whatsapp`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; instanțierea pe index și worker-ii sunt în cod și în contractele `q--wa--phone_01` … `_20`, nu în această muchie.

## Sinapse dependență în același traseu

[`q-wa-phone-xx-email-cold-add-to-campaign.md`](q-wa-phone-xx-email-cold-add-to-campaign.md), [`q-wa-phone-xx-email-cold-analytics-fetch.md`](q-wa-phone-xx-email-cold-analytics-fetch.md), [`q-wa-phone-xx-email-cold-campaign-create.md`](q-wa-phone-xx-email-cold-campaign-create.md), [`q-wa-phone-xx-email-cold-campaign-pause.md`](q-wa-phone-xx-email-cold-campaign-pause.md), [`q-wa-phone-xx-email-cold-lead-status.md`](q-wa-phone-xx-email-cold-lead-status.md), [`q-wa-phone-xx-q-email-cold.md`](q-wa-phone-xx-q-email-cold.md), [`q-wa-phone-xx-q-email-warm.md`](q-wa-phone-xx-q-email-warm.md).

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

- **Runtime (ADR-0001):** `e2-whatsapp` nu este cheie în `QUEUES`; execuția = familia de cozi `q:wa:phone-*`.
- **Semantic (ADR-0002):** vezi pattern-uri catalog în contract neuron.
- **Planificare:** v2 §7 — `q-wa-phone-xx` → `e2-whatsapp`.

## Limite și reconcilieri

- Eticheta graf **`q-wa-phone-xx`** (hyphen) vs convenții v2 **`q:wa:phone_XX`** și runtime **`q:wa:phone-NN`** — reconciliere obligatorie prin [`../../../neurons/E2/q--wa--phone_xx.md`](../../../neurons/E2/q--wa--phone_xx.md).
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`q-wa-phone-xx-family\``.
