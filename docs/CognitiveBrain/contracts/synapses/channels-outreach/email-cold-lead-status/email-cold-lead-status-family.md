# Sinapsă `email-cold-lead-status-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `email-cold-lead-status-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/email-cold-lead-status/email-cold-lead-status-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `email-cold-lead-status` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `email-cold-lead-status` | Traseu în graf; **runtime:** coadă canonică **`email:cold:lead:status`** — [`../../../neurons/E2/email--cold--lead--status.md`](../../../neurons/E2/email--cold--lead--status.md); **Registry:** `EMAIL_COLD_LEAD_STATUS` (`workers/shared/src/queue-registry.ts`). |
| Destinație (graf) | `e2-email-cold` | Agregat de planificare pentru familia **email-cold** (E2), nu o singură coadă BullMQ; fără fișier neuron unic pentru această etichetă de graf. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** ancorează traseul `email-cold-lead-status` în nucleul **`e2-email-cold`**. Descrierea v2: **„specializează familia”**. Exportul nu fixează payload sau handler pentru această muchie de familie.

## Sinapse dependență în același traseu

[`email-cold-lead-status-email-warm-document.md`](email-cold-lead-status-email-warm-document.md), [`email-cold-lead-status-email-warm-proforma.md`](email-cold-lead-status-email-warm-proforma.md), [`email-cold-lead-status-email-warm-send.md`](email-cold-lead-status-email-warm-send.md) — muchii **dependency** către traseele warm (v2 §7).

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

- **Runtime (ADR-0001):** execuție pe **`email:cold:lead:status`** — vezi registry și contractul E2.
- **Semantic (ADR-0002):** `e2:email:cold-lead-status`; **`e2-email-cold`** = agregat de plan.
- **Planificare:** muchie de familie; nu enumeră implicit toate job-urile din swimlane.

## Limite și reconcilieri

- Slug graf vs coadă: mapare explicită; prevală registry-ul pentru nume executabile.
- Procesarea evenimentelor (Instantly → tracking) este descrisă în contractul neuron, nu în exportul muchiei `*-family`.
- Nu inventa schemă payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`email-cold-lead-status-family\``.
