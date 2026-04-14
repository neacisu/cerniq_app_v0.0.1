# Sinapsă `campaign-cluster-launch-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `campaign-cluster-launch-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/campaign-cluster-launch/campaign-cluster-launch-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `campaign-cluster-launch` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `campaign-cluster-launch` | Traseu în graf; [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md). **Runtime (ADR-0001):** contractul neuron documentează **gap** — literal `campaign:cluster:launch` lipsă din `queue-registry.ts` la audit; **nu** afirma coadă executabilă fără reconciliere. **Semantic (ADR-0002):** neuron neconectat în catalog la același audit — vezi contract. |
| Destinație (graf) | `e5-referral` | Nod agregat **familie referral** E5 în planificare; nu este o singură coadă executabilă; vezi ADR / catalog familie referral. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **lansare campanie pe cluster (referral)** sub agregatul **`e5-referral`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; detalii operaționale rămân în contractele neuron și în cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`campaign-cluster-launch-content-drip-schedule.md`](campaign-cluster-launch-content-drip-schedule.md), [`campaign-cluster-launch-content-drip-send.md`](campaign-cluster-launch-content-drip-send.md), [`campaign-cluster-launch-content-personalize-ai.md`](campaign-cluster-launch-content-personalize-ai.md), [`campaign-cluster-launch-content-seasonal-generate.md`](campaign-cluster-launch-content-seasonal-generate.md), [`campaign-cluster-launch-email-cold-add-to-campaign.md`](campaign-cluster-launch-email-cold-add-to-campaign.md), [`campaign-cluster-launch-wa-send-initial.md`](campaign-cluster-launch-wa-send-initial.md), [`campaign-cluster-launch-wa-send-reply.md`](campaign-cluster-launch-wa-send-reply.md).

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

- **Runtime (ADR-0001):** `e5-referral` nu este cheie în `QUEUES`; sursa `campaign-cluster-launch` — vezi gap în contract neuron.
- **Semantic (ADR-0002):** E5, familie `referral` în v2 neuron — aliniere parțială / gap în catalog, vezi contract.
- **Planificare:** v2 §7 — `campaign-cluster-launch` → `e5-referral`.

## Limite și reconcilieri

- Traseul este **planificat** în v2; implementarea handlerului pentru coada nominală poate lipsi — vezi [`../../../neurons/E5/campaign--cluster--launch.md`](../../../neurons/E5/campaign--cluster--launch.md).
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`campaign-cluster-launch-family\``.
