# Sinapsă `enrich-termene-company-base-enrich-ai-industry-classify`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-company-base-enrich-ai-industry-classify` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-company-base/enrich-termene-company-base-enrich-ai-industry-classify.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-company-base` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-company-base` | Contract: [`../../../neurons/E1/enrich--termene--company-base.md`](../../../neurons/E1/enrich--termene--company-base.md). **v2_queue:** `enrich:termene:company-base`. |
| Destinație (graf) | `enrich-ai-industry-classify` | Contract: [`../../../neurons/E1/enrich--ai--industry-classify.md`](../../../neurons/E1/enrich--ai--industry-classify.md). **v2_queue:** `enrich:ai:industry-classify`. Reconciliere `enrich:ai:*` / `ai:*`: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** leagă în **graf** traseul Termene «company-base» de traseul **enrich-ai-industry-classify** (clasificare sector / industrie în modelul v2). Rolul de business presupus de topologie: după sau în paralel cu îmbogățirea externă, pipeline-ul de planificare prevede și pas AI de clasificare; **fără** detalii de payload din export. Capetele au **decalaje documentate** față de cozi runtime (vezi contracte neuron).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | Nici sursa v2 «company-base», nici ținta «industry-classify» nu au neapărat nume identice cu `queueName` în registry — vezi audit neuron. |
| **Semantic (ADR-0002)** | Ambele etichete aparțin stratului E1; familii `enrichment` vs `ai-enrichment` în v2. |
| **Planificare** | v2 §7 — `dependency` între nodurile de graf indicate. |

## Limite și reconcilieri

- Nu se completează politici sau scheme lipsă din export; orice implementare concretă rămâne în cod și în ADR-uri.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-company-base-enrich-ai-industry-classify\``.
