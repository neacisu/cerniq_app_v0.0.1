# Sinapsă `referral-reward-process-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-reward-process-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-reward-process/referral-reward-process-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-reward-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-reward-process` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--reward--process.md`](../../../neurons/E5/referral--reward--process.md). **Triplă autoritate:** v2 **`referral:reward:process`**; **runtime (ADR-0001):** lanț **`referral:reward:issue`** → **`referral:reward:notify`** (E30 → E31), `nodeKey` **`e5:referral:reward-issue`** și **`e5:referral:reward-notify`** — vezi neuron; **nu** există o singură coadă cu slug-ul graf agregat. |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-reward-process** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-reward-process-content-drip-schedule.md`](referral-reward-process-content-drip-schedule.md), [`referral-reward-process-content-drip-send.md`](referral-reward-process-content-drip-send.md), [`referral-reward-process-content-personalize-ai.md`](referral-reward-process-content-personalize-ai.md), [`referral-reward-process-content-seasonal-generate.md`](referral-reward-process-content-seasonal-generate.md), [`referral-reward-process-email-cold-add-to-campaign.md`](referral-reward-process-email-cold-add-to-campaign.md), [`referral-reward-process-wa-send-initial.md`](referral-reward-process-wa-send-initial.md), [`referral-reward-process-wa-send-reply.md`](referral-reward-process-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-reward-process` → `e5-referral`.
- **Semantic / runtime:** un nod graf „process” acoperă **două** cozi în lanț (emitere + notificare) — vezi contractul neuronului.

## Limite și reconcilieri

- **Agregare graf:** `referral-reward-process` nu este echivalent cu o singură înregistrare în `queue-registry`; reconcilierea este documentată în `referral--reward--process.md`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-reward-process-family\``.
