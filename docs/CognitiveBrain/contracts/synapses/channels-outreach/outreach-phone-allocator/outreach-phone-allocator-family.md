# Sinapsă `outreach-phone-allocator-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `outreach-phone-allocator-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/outreach-phone-allocator/outreach-phone-allocator-family.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `outreach-phone-allocator` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `outreach-phone-allocator` | Traseu în graf; [`../../../neurons/E2/outreach--phone--allocator.md`](../../../neurons/E2/outreach--phone--allocator.md). **Runtime (ADR-0001):** coada `outreach:phone:allocator` (`OUTREACH_PHONE_ALLOCATOR`); **Semantic (ADR-0002):** `e2:outreach:phone-allocator` — vezi contract neuron. |
| Destinație (graf) | `e2-orchestrator` | Nod agregat **familie orchestrator** E2 în planificare; nu este o singură coadă executabilă; vezi [`../../../../adr/families/e2/orchestrator.md`](../../../../adr/families/e2/orchestrator.md) și secțiunea v2 `ADR-FAMILY-e2-orchestrator`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **alocare telefon outreach (WA)** sub agregatul **`e2-orchestrator`**. v2: **„specializează familia”** — fără payload în câmpurile sinapsei; fluxul operațional (sticky, `SKIP LOCKED`, enqueue selector canal) este în contractul neuron și în cod, nu în exportul muchiei.

## Sinapse dependență în același traseu

[`outreach-phone-allocator-template-spintax-process.md`](outreach-phone-allocator-template-spintax-process.md).

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

- **Runtime (ADR-0001):** `e2-orchestrator` nu este cheie în `QUEUES`; sursa este coadă concretă — vezi contract [`outreach--phone--allocator.md`](../../../neurons/E2/outreach--phone--allocator.md).
- **Semantic (ADR-0002):** orchestrator E2, `pipeline-control` pentru allocator — aliniere în catalog pentru `e2:outreach:phone-allocator`.
- **Planificare:** v2 §7 — `outreach-phone-allocator` → `e2-orchestrator`.

## Limite și reconcilieri

- Agregatul `e2-orchestrator` grupează mai mulți neuroni orchestrator; muchia nu spune care sub-neuron rulează primul după alocare.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`outreach-phone-allocator-family\``.
