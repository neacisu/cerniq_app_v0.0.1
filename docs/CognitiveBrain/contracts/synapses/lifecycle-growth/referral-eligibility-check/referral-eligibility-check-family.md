# Sinapsă `referral-eligibility-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-eligibility-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-eligibility-check/referral-eligibility-check-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-eligibility-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-eligibility-check` | Traseu în graf; contract neuron: [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md). **Triplă autoritate:** v2 **`referral:eligibility:check`**; **runtime (ADR-0001):** neuronul documentează **lipsă** înregistrare în `queue-registry.ts` și **fără** worker dedicat — vezi neuron (emitere parțială din tranziții de stare). |
| Destinație (graf) | `e5-referral` | Agregat **familie referral** în planificare. ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-eligibility-check** sub agregatul **`e5-referral`**. v2: **„specializează familia”**; exportul **nu** encodează payload, retry, safety sau telemetrie per-muchie.

## Sinapse dependență în același traseu

[`referral-eligibility-check-content-drip-schedule.md`](referral-eligibility-check-content-drip-schedule.md), [`referral-eligibility-check-content-drip-send.md`](referral-eligibility-check-content-drip-send.md), [`referral-eligibility-check-content-personalize-ai.md`](referral-eligibility-check-content-personalize-ai.md), [`referral-eligibility-check-content-seasonal-generate.md`](referral-eligibility-check-content-seasonal-generate.md), [`referral-eligibility-check-email-cold-add-to-campaign.md`](referral-eligibility-check-email-cold-add-to-campaign.md), [`referral-eligibility-check-wa-send-initial.md`](referral-eligibility-check-wa-send-initial.md), [`referral-eligibility-check-wa-send-reply.md`](referral-eligibility-check-wa-send-reply.md).

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

- **Planificare:** v2 §7 — `referral-eligibility-check` → `e5-referral`.
- **Runtime / semantic:** vezi [`../../../neurons/E5/referral--eligibility--check.md`](../../../neurons/E5/referral--eligibility--check.md) pentru gap consumator / emitere job.

## Limite și reconcilieri

- Graful afirmă traseul **referral-eligibility-check**; **nu** înlocuiește dovada unei cozi executabile dedicate în registry.
- Muchiile `dependency` către conținut / canale rămân structurale în export; ordinea operațională nu este în câmpurile sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-eligibility-check-family\``.
