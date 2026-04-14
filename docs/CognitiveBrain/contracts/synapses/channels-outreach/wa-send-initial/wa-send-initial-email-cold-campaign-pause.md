# Sinapsă `wa-send-initial-email-cold-campaign-pause`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-send-initial-email-cold-campaign-pause` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-send-initial/wa-send-initial-email-cold-campaign-pause.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-send-initial` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-send-initial` | **`wa:send:initial`** (graf) — [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md); **runtime:** **`q:wa:phone-NN`**. |
| Destinație | `email-cold-campaign-pause` | **`email:cold:campaign:pause`** — [`../../../neurons/E2/email--cold--campaign--pause.md`](../../../neurons/E2/email--cold--campaign--pause.md); **Registry:** `EMAIL_COLD_CAMPAIGN_PAUSE`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** WA inițial ↔ **pauză campanie cold**. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `q:wa:phone-*` → `EMAIL_COLD_CAMPAIGN_PAUSE`.
- **Semantic (ADR-0002):** E2.
- **Planificare:** export-grounded.

## Limite și reconcilieri

- Structură DAG; execuție — workers outreach.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-send-initial-email-cold-campaign-pause\``.
