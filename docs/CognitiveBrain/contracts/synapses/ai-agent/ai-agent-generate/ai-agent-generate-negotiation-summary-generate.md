# Sinapsă `ai-agent-generate-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-generate-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-generate` | **Planificare:** traseu `ai-agent-generate`. **Matrix:** `ai:agent:generate` → [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). Contractul neuron: **gap** registry/handler pentru coada literală; reconciliere cu cozile reale E3 înainte de a interpreta sursa ca job executabil sub acest nume. |
| Destinație (graf) | `negotiation-summary-generate` | **Matrix:** `negotiation:summary:generate` → [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md). Contractul neuron: **gap runtime** — căutare cod pentru coada literală zero la audit; **fără** intrare în `queue-registry.ts` și fără potrivire în `cognitive-node-catalog.ts` la acel audit. Muchia rămâne **export-grounded** pentru topologie; implementarea destinației necesită implementare sau mapare ulterioară. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența din graf poziționează traseul `ai-agent-generate` în raport cu `negotiation-summary-generate`. Descrierea v2 pentru sinapsă este **„sinapsă canonică de pipeline”** — fără detaliu despre conținutul rezumatului sau despre sursa datelor. Interpretare business conservatoare: planificarea prevede un pas de generare a unui rezumat de negociere după sau în dependență de linia de generare agent; **ambele capete** au gap-uri de aliniere runtime documentate în contractele neuron respective, deci fluxul end-to-end nu poate fi dedus din export singur.

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

- **Runtime (ADR-0001):** **ambele** capete au evidență de gap sau neconcordanță în contractele neuron față de registry — nu afirma lansare garantată pe aceste cozi fără verificare curentă în cod.
- **Semantic (ADR-0002):** pentru `negotiation:summary:generate`, catalogul nu oferă la auditul din contract o potrivire; pentru sursă, aceeași situație pentru `ai:agent:generate`.
- **Planificare:** muchia este validă ca **înregistrare de graf**; reconcilierea cu cozi și `nodeKey`-uri este sarcină separată.

## Limite și reconcilieri

- Gap-urile din contractul neuron `negotiation--summary--generate.md` **nu** sunt „rezolvate” de această sinapsă; se propagă ca limită de evidență.
- Orice viitoare implementare a rezumatului trebuie să actualizeze registry, catalog și acest contract dacă apare mapare reală.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-generate-negotiation-summary-generate\``.
