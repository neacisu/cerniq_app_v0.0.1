# Sinapsă `outreach-wa-delay-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-wa-delay-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-wa-delay/outreach-wa-delay-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-wa-delay` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `outreach-wa-delay` | Traseu în graf; [`../../../neurons/E2/outreach--wa--delay.md`](../../../neurons/E2/outreach--wa--delay.md). **Runtime (ADR-0001):** la audit, literal `outreach:wa:delay` **lipsește** din `queue-registry.ts`; v2 marchează coadă din export **ne-reconciliată** cu registry — vezi contract neuron. |
| Destinație (graf) | `e2-orchestrator` | Agregat familie orchestrator E2; [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md); v2 `ADR-FAMILY-e2-orchestrator`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** atașează traseul **întârziere / amânare WA (planificat)** la familia **`e2-orchestrator`**. v2: **„specializează familia”**. Semantica operațională (ex. legătură cu cotă depășită în specificații Etapa 2) este în contractul neuron și în cod — **nu** în câmpurile sinapsei din export.

## Sinapse dependență în același traseu

[`outreach-wa-delay-template-spintax-process.md`](outreach-wa-delay-template-spintax-process.md).

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

- **Runtime (ADR-0001):** **gap** pentru coada nominală `outreach:wa:delay` — vezi contract neuron; `e2-orchestrator` rămâne agregat, nu coadă.
- **Semantic (ADR-0002):** **gap** `nodeKey` catalog pentru acest antet la audit — vezi `NEURON_MATRIX.csv` / contract.
- **Planificare:** v2 §7 — `outreach-wa-delay` → `e2-orchestrator`.

## Limite și reconcilieri

- **Graf ↔ runtime:** planificarea include muchia; implementarea cozii dedicate poate lipsi — reconciliere explicită obligatorie înainte de afirmații despre execuție.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-wa-delay-family\``.
