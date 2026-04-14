# Sinapsă `outreach-wa-reschedule-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-reschedule-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-reschedule/outreach-wa-reschedule-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-reschedule` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `outreach-wa-reschedule` | Traseu în graf; [`../../../neurons/E2/outreach--wa--reschedule.md`](../../../neurons/E2/outreach--wa--reschedule.md). **Runtime (ADR-0001):** literal `outreach:wa:reschedule` **absent** din `queue-registry.ts` la audit; v2: coadă din export ne-reconciliată — vezi contract. |
| Destinație (graf) | `e2-orchestrator` | Agregat familie orchestrator E2; [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md); v2 `ADR-FAMILY-e2-orchestrator`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **reprogramare WA (planificat)** sub **`e2-orchestrator`**. v2: **„specializează familia”**. Rolul operațional (ex. asociere cu `OUTSIDE_BUSINESS_HOURS` în specificații) este documentat la neuron, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`outreach-wa-reschedule-template-spintax-process.md`](outreach-wa-reschedule-template-spintax-process.md).

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

- **Runtime (ADR-0001):** gap pentru coada sursă; agregat țintă fără mapare 1:1 la `QUEUES`.
- **Semantic (ADR-0002):** gap `nodeKey` pentru sursă — vezi matrice / contract neuron.
- **Planificare:** v2 §7 — `outreach-wa-reschedule` → `e2-orchestrator`.

## Limite și reconcilieri

- Diferență cunoscută între **specificație Etapa 2** (enqueue pe coadă reschedule) și **audit workers** — vezi contract neuron; sinapsa rămâne ancorată doar în exportul v2 §7.
- Fără inventare de payload sau politici de retry.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-reschedule-family\``.
