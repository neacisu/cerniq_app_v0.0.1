# Sinapsă `document-template-compile-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-template-compile-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-template-compile/document-template-compile-channel-routing-decide.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-template-compile` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-template-compile` | **Registry:** `E3_DOCUMENT_TEMPLATE_COMPILE` → `document:template:compile`. **Contract:** [`../../../neurons/E3/document--template--compile.md`](../../../neurons/E3/document--template--compile.md). |
| Destinație (graf) | `channel-routing-decide` | **v2 / neuron:** `channel:routing:decide` — [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). **Execuție:** **`channel:route:decide`** (`E3_CHANNEL_ROUTE_DECIDE`). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

După **compilarea template-ului**, planificarea prevede legătură canonică cu **decizia de rutare pe canal**. v2: **„sinapsă canonică de pipeline”**. J58 rămâne punctul de decizie WA/EMAIL/PHONE/HITL — fără detalii în sinapsa din §7.

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

- **Runtime (ADR-0001):** sursă template compile; **Destinație (coadă):** `channel:route:decide`.
- **Semantic (ADR-0002):** vezi contracte I54 și J58.
- **Planificare:** dependență declarativă compilare → rutare.

## Limite și reconcilieri

- Reconciliere **`channel:routing:decide`** vs **`channel:route:decide`** — obligatorie (vezi contractul `channel--routing--decide.md`).
- Nu afirmați enfileuire directă fără dovezi în workeri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-template-compile-channel-routing-decide\``.
