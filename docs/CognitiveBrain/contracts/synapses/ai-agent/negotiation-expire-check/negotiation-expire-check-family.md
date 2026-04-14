# Sinapsă `negotiation-expire-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `negotiation-expire-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/negotiation-expire-check/negotiation-expire-check-family.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `negotiation-expire-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `negotiation-expire-check` | Slug traseu în graf. **Execuție (ADR-0001):** **`negotiation:expire:check`** (`QUEUES.E3_NEGOTIATION_EXPIRE_CHECK`). [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). |
| Destinație (graf) | `e3-negotiation` | Agregat de planificare pentru familia **negotiation** (E3); nu este o singură coadă BullMQ. Nu există contract neuron unic pentru eticheta `e3-negotiation`. |

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

- **Runtime (ADR-0001):** sursă ancorată în `QUEUES.E3_NEGOTIATION_EXPIRE_CHECK` — `workers/shared/src/queue-registry.ts`. Destinația `e3-negotiation` rămâne agregat de graf; neuroni concreți: [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) (filtru `negotiation` / E3).
- **Semantic (ADR-0002):** `e3:negotiation:expire-check` — catalog + contract neuron.
- **Planificare:** muchie **default** „specializează familia”; fără semantica operațională suplimentară în v2 §7.

## Limite și reconcilieri

- Slug **`negotiation-expire-check`** ↔ coadă **`negotiation:expire:check`**. Nu reduceți `e3-negotiation` la un singur `nodeKey` fără dovezi din catalog.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`negotiation-expire-check-family\``.
