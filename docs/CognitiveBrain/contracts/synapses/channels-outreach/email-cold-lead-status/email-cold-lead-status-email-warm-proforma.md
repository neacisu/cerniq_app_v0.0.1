# Sinapsă `email-cold-lead-status-email-warm-proforma`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-lead-status-email-warm-proforma` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-lead-status/email-cold-lead-status-email-warm-proforma.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-lead-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-lead-status` | **Runtime:** **`email:cold:lead:status`** — [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md); **Registry:** `EMAIL_COLD_LEAD_STATUS`. |
| Destinație | `email-warm-proforma` | **Runtime:** **`email:warm:proforma`** — [`../../../neurons/E2/email--warm--proforma.md`](../../../neurons/E2/email--warm--proforma.md); **Registry:** `EMAIL_WARM_PROFORMA`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

Exportul plasează o dependență de la **actualizarea statusului lead cold** către traseul **`email-warm-proforma`**, în sensul DAG-ului de planificare. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie. **Atenție:** semantica „proforma” vs reply pipeline — vezi neuron.

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

- **Runtime (ADR-0001):** `EMAIL_COLD_LEAD_STATUS` → `EMAIL_WARM_PROFORMA`.
- **Semantic (ADR-0002):** `e2:email:cold-lead-status` → `e2:email:warm-proforma`.
- **Planificare:** capete graf ca în v2.

## Limite și reconcilieri

- Nu se presupune că fiecare muchie de planificare implică un singur tip de job sau un ordonator central — doar structura exportată.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-lead-status-email-warm-proforma\``.
