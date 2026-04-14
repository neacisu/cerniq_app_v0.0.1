# Sinapsă `webhook-timelinesai-ingest-lead-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `webhook-timelinesai-ingest-lead-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/webhook-timelinesai-ingest/webhook-timelinesai-ingest-lead-state-transition.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `webhook-timelinesai-ingest` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `webhook-timelinesai-ingest` | **Contract:** [`../../../neurons/E2/webhook--timelinesai--ingest.md`](../../../neurons/E2/webhook--timelinesai--ingest.md). **Runtime:** `webhook:timelinesai:ingest`. **Semantic:** `e2:webhook:timelinesai`. |
| Destinație (graf) | `lead-state-transition` | **Contract:** [`../../../neurons/E2/lead--state--transition.md`](../../../neurons/E2/lead--state--transition.md). **Runtime (ADR-0001):** `lead:state:transition`. **Semantic (ADR-0002):** `e2:lead:state-transition`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependență de planificare: **ingest TimelinesAI** precede sau cere **tranziția de stare FSM a leadului** în graf. v2: **„sinapsă canonică de pipeline”**. În cod, workerul de ingest enfilează tranziții (ex. `WARM_REPLY`) — vezi contract sursă; muchia nu encodează stările sau validările FSM.

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

- **Runtime (ADR-0001):** cozi distincte, ambele în registry — dovezi în contracte neuron.
- **Semantic (ADR-0002):** ingest E2 → lead-fsm procedural E2.
- **Planificare:** `webhook-timelinesai-ingest` → `lead-state-transition`.

## Limite și reconcilieri

- Regulile `validateTransition` și efectele secundare (ex. `sequence:stop`) sunt în workerul FSM, nu în câmpurile sinapsei din export.
- Fără presupuneri despre retry/idempotență per muchie.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`webhook-timelinesai-ingest-lead-state-transition\``.
