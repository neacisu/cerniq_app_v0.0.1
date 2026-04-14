# Sinapsă `wa-media-send-email-cold-add-to-campaign`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `wa-media-send-email-cold-add-to-campaign` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/wa-media-send/wa-media-send-email-cold-add-to-campaign.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `wa-media-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `wa-media-send` | **Runtime:** **`wa:media:send`** — [`../../../neurons/E2/wa--media--send.md`](../../../neurons/E2/wa--media--send.md); **Registry:** `WA_MEDIA_SEND`. |
| Destinație | `email-cold-add-to-campaign` | Graf **`email-cold-add-to-campaign`** / v2 `email:cold:add-to-campaign` — [`../../../neurons/E2/email--cold--add-to-campaign.md`](../../../neurons/E2/email--cold--add-to-campaign.md). **Execuție:** în practică **`q:email:cold`**, **`EMAIL_COLD`** — vezi neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop în lanț (export + context repo)

**Dependency** între **trimiterea media WA** și traseul cold **add-to-campaign** în planificare. **Dovadă:** v2 §7. **Nedovedit:** payload, retry, safety, telemetrie.

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

- **Runtime (ADR-0001):** `WA_MEDIA_SEND` → `EMAIL_COLD` (operație cold concretă — neuron).
- **Semantic (ADR-0002):** `e2:wa:media-send` → `e2:email:cold-send`.
- **Planificare:** capete din export.

## Limite și reconcilieri

- Reconciliere slug graf vs **`q:email:cold`** — obligatorie pentru cititori.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`wa-media-send-email-cold-add-to-campaign\``.
