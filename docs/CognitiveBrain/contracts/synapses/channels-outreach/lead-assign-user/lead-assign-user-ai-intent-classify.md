# Sinapsă `lead-assign-user-ai-intent-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `lead-assign-user-ai-intent-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/lead-assign-user/lead-assign-user-ai-intent-classify.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `lead-assign-user` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `lead-assign-user` | **Contract:** [`../../../neurons/E2/lead--assign--user.md`](../../../neurons/E2/lead--assign--user.md). **Runtime (ADR-0001):** `QUEUES.LEAD_ASSIGN_USER` → `lead:assign:user`. |
| Destinație (graf) | `ai-intent-classify` | **Contract:** [`../../../neurons/E2/ai--intent--classify.md`](../../../neurons/E2/ai--intent--classify.md). **Atenție:** în export,ținta este slug-ul graf `ai-intent-classify`; contractul neuron documentează **decalaje** între coada canonică v2 `ai:intent:classify` și implementări runtime (ex. `intent:classify` E3) — vezi secțiunea „Scop în context real” din contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

v2 clasifică muchia drept **„sinapsă canonică de pipeline”** între **asignarea lead-ului** și **clasificarea intenției** în modelul de planificare. Semnificația operațională exactă (cine enfilează, după ce eveniment) **nu** este codificată în câmpurile exportului sinapsei; se sprijină pe contractele neuron sursă/destinație și pe cod.

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

- **Runtime:** sursa are coadă în registry; ținta necesită **reconciliere slug graf ↔ cozi** (documentată în contractul `ai:intent:classify`).
- **Semantic:** E2 lead-fsm vs analiză AI — vezi catalog și contracte.
- **Planificare:** dependență declarativă `dependency`.

## Limite și reconcilieri

- Prezența muchiei în graf **nu** implică singură că fiecare execuție `lead:assign:user` declanșează un job pe coada efectivă de intent classify din runtime.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`lead-assign-user-ai-intent-classify\``.
