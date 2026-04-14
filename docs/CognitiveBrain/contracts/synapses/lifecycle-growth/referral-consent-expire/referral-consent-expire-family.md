# Sinapsă `referral-consent-expire-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `referral-consent-expire-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/referral-consent-expire/referral-consent-expire-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `referral-consent-expire` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `referral-consent-expire` | **Graf:** expirare / consolidare consent referral (planificare). Contract neuron: [`../../../neurons/E5/referral--consent--expire.md`](../../../neurons/E5/referral--consent--expire.md). **Triplă autoritate:** v2 `referral:consent:expire`; **runtime:** contractul neuron documentează **gap** față de `queue-registry.ts` — nu presupunem coadă executabilă aici. |
| Destinație (graf) | `e5-referral` | Agregat **`e5-referral`**. v2: [`### ADR-FAMILY-e5-referral`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../../adr/families/e5/referral.md`](../../../../adr/families/e5/referral.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **referral-consent-expire** sub **`e5-referral`**, descriere v2 **„specializează familia”**: fluxul de expirare a consentului referral este, în planificare, parte a agregatului referral E5.

## Sinapse dependență în același traseu

[`referral-consent-expire-content-drip-schedule.md`](referral-consent-expire-content-drip-schedule.md), [`referral-consent-expire-content-drip-send.md`](referral-consent-expire-content-drip-send.md), [`referral-consent-expire-content-personalize-ai.md`](referral-consent-expire-content-personalize-ai.md), [`referral-consent-expire-content-seasonal-generate.md`](referral-consent-expire-content-seasonal-generate.md), [`referral-consent-expire-email-cold-add-to-campaign.md`](referral-consent-expire-email-cold-add-to-campaign.md), [`referral-consent-expire-wa-send-initial.md`](referral-consent-expire-wa-send-initial.md), [`referral-consent-expire-wa-send-reply.md`](referral-consent-expire-wa-send-reply.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | **Nereconciliat** sub numele v2 — vezi contract neuron (fără intrare dedicată `referral:consent:expire` în registry la auditul citat acolo). |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `referral:consent:expire` la **L313** (fișier). |
| **Planificare** | v2 §7 — `referral-consent-expire` → `e5-referral`. |

## Limite și reconcilieri

- Traseul este **export-grounded** în graf; legătura la cozi reale trebuie dovedită separat (contract neuron enumeră gap-ul față de cod).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`referral-consent-expire-family\``.
