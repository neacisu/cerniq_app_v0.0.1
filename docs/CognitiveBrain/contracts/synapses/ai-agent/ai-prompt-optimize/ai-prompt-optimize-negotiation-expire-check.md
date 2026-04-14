# Sinapsă `ai-prompt-optimize-negotiation-expire-check`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-prompt-optimize-negotiation-expire-check` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-prompt-optimize/ai-prompt-optimize-negotiation-expire-check.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-prompt-optimize` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-prompt-optimize` | **Planificare:** traseu `ai-prompt-optimize`. **Matrix:** `ai:prompt:optimize` → [`../../../neurons/E3/ai--prompt--optimize.md`](../../../neurons/E3/ai--prompt--optimize.md). Contractul neuron: **gap registry / handler** documentat pentru coada nominală; nu interpretați sursa ca job BullMQ canonic fără reconciliere `queue-registry.ts`. |
| Destinație (graf) | `negotiation-expire-check` | **Registry (ADR-0001):** `E3_NEGOTIATION_EXPIRE_CHECK` → `negotiation:expire:check`. **Contract:** [`../../../neurons/E3/negotiation--expire--check.md`](../../../neurons/E3/negotiation--expire--check.md). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv). **Catalog (ADR-0002):** `negotiation:expire:check` / `e3:negotiation:expire-check` (vezi catalog + contract neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează în planificare traseul `ai-prompt-optimize` în legătură canonică cu `negotiation-expire-check`. v2 descrie sinapsa ca **„sinapsă canonică de pipeline”**, fără detalii de flux între optimizarea promptului (neuron sursă ne-reconciliat cu registry la audit) și verificarea expirării. Semantica operațională a țintei este în contractul neuron de negociere, nu în registrul sinapsei.

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

- **Runtime (ADR-0001):** ținta este executabilă în registry; sursa **nu** este dovedită în registry la auditul din contractul neuron — muchia rămâne **declarativă** până la reconciliere.
- **Semantic (ADR-0002):** pentru țintă, catalog + contract; pentru sursă, gap catalog documentat în contractul neuron.
- **Planificare:** dependență declarată între traseul de optimizare prompt și verificarea expirării negocierii.

## Limite și reconcilieri

- Slug-uri graf vs cozi `:` — fără presupuneri despre payload.
- Dacă optimizarea promptului este doar planificată în graf și nu are worker dedicat, ordinea față de `negotiation:expire:check` exprimă **intenție de pipeline**, nu dovadă de enfileuire.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-prompt-optimize-negotiation-expire-check\``.
