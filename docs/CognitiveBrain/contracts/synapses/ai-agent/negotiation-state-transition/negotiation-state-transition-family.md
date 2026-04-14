# Sinapsă `negotiation-state-transition-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-state-transition-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-state-transition/negotiation-state-transition-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-state-transition` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `negotiation-state-transition` | Slug traseu în graf. **Execuție (ADR-0001):** **`negotiation:state:transition`** (`QUEUES.E3_NEGOTIATION_STATE_TRANSITION`). [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). |
| Destinație (graf) | `e3-negotiation` | Agregat de planificare pentru familia **negotiation** (E3); nu este o singură coadă BullMQ. |

## Tip muchie (export)

- **Export edge type:** `default`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursă = `QUEUES.E3_NEGOTIATION_STATE_TRANSITION` — `workers/shared/src/queue-registry.ts`. Destinație agregat; neuroni: [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv).
- **Semantic (ADR-0002):** `e3:negotiation:state-transition` — catalog + contract neuron.
- **Planificare:** muchie **default** „specializează familia”; fără detalii suplimentare în v2 §7.

## Limite și reconcilieri

- Slug **`negotiation-state-transition`** ↔ **`negotiation:state:transition`**.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-state-transition-family\``.
