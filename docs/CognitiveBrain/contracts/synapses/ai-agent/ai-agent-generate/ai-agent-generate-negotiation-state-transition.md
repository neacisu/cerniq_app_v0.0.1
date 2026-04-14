# Sinapsă `ai-agent-generate-negotiation-state-transition`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-generate-negotiation-state-transition` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-state-transition.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-generate` | **Planificare:** traseu `ai-agent-generate`. **Matrix:** `ai:agent:generate` → [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). Contractul neuron: **neconciliat** cu handler dedicat și intrare registry pentru coada literală; nu extrapola comportament din numele traseului. |
| Destinație (graf) | `negotiation-state-transition` | **Matrix:** `negotiation:state:transition` → [`../../../neurons/E3/negotiation--state--transition.md`](../../../neurons/E3/negotiation--state--transition.md). **Registry:** `E3_NEGOTIATION_STATE_TRANSITION` → `negotiation:state:transition`. **Catalog:** perechi documentate în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia declară o **dependency** de la `ai-agent-generate` către `negotiation-state-transition`: în planificare, evoluția stării negocierii este un pas plasat în relație canonică cu traseul de generare agent. Textul v2 pentru sinapsă rămâne la **„sinapsă canonică de pipeline”** — fără enumerare de stări (`PROPOSAL`, `NEGOTIATION`, etc.) sau trigger-e în export. Semantica detaliată a tranzițiilor aparține contractului neuron destinație și implementării; această pagină nu o completează din presupuneri.

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

- **Runtime (ADR-0001):** ținta are mapare documentată în contractul neuron; sursa necesită **reconciliere graf ↔ registry** ca la [`ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md).
- **Semantic (ADR-0002):** catalog + contract pentru `negotiation:state:transition`; pentru sursă, verificare explicită a prezenței `nodeKey`.
- **Planificare:** dependență structurală în graf, distinctă de o relație „același mesaj de coadă”.

## Limite și reconcilieri

- Fără completări speculative despre stări sau payload; doar ce susține v2 §7 și, separat, contractele neuron.
- Dacă în runtime tranzițiile sunt declanșate de alte cozi decât `ai:agent:generate`, muchia din graf rămâne utilă pentru **trasabilitate planificare**, nu pentru numele cozii sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-generate-negotiation-state-transition\``.
