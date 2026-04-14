# Sinapsă `wa-send-followup-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-followup-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-followup/wa-send-followup-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-followup` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-followup` | Graf **`wa:send:followup`** — [`../../../neurons/E2/wa--send--followup.md`](../../../neurons/E2/wa--send--followup.md). **Runtime:** **`q:wa:phone-NN:followup`** (nu `wa:send:followup` literal). |
| Destinație | `email-cold-add-to-campaign` | v2 `email:cold:add-to-campaign` — [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Execuție:** **`q:email:cold`**, **`EMAIL_COLD`**. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între **follow-up WhatsApp (plan)** și traseul cold **add-to-campaign**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** cozi WA follow-up (pattern) ↔ **`EMAIL_COLD`** pentru operația cold concretă.
- **Semantic (ADR-0002):** vezi catalog / CSV.
- **Planificare:** capete `wa-send-followup`, `email-cold-add-to-campaign`.

## Limite și reconcilieri

- Două reconcilieri: (1) graf WA follow-up ↔ cozi `:followup`; (2) graf add-to-campaign ↔ **`q:email:cold`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-followup-email-cold-add-to-campaign\``.
