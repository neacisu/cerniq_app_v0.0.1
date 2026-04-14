# Sinapsă `enrich-termene-company-base-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-company-base-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-company-base/enrich-termene-company-base-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-company-base` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-company-base` | Contract: [`../../../neurons/E1/enrich--termene--company-base.md`](../../../neurons/E1/enrich--termene--company-base.md). **v2_queue:** `enrich:termene:company-base`. |
| Destinație (graf) | `enrich-ai-text-structure` | Contract: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). **v2_queue:** `enrich:ai:text-structure`. Reconciliere graf vs `ai:structure:xai`: discuție în contractul destinație și [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Muchia **`dependency`** conectează în planificare traseul Termene «company-base» de traseul **enrich-ai-text-structure** (structurare text / date neuniforme → structură în sensul v2). Interpretarea operațională exactă (ex. apel J1) **nu** face parte din câmpurile sinapsei exportate; rămâne în contractul neuron destinație.

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
| **Runtime (ADR-0001)** | Verificare cozi în `queue-registry.ts` pentru ambele capete: vezi contracte neuron (gaps / mapări indirecte). |
| **Semantic (ADR-0002)** | Noduri E1 — detalii swimlane în catalog unde există intrare. |
| **Planificare** | v2 §7 — muchie `dependency` explicită. |

## Limite și reconcilieri

- **Export-grounded:** fără inventarea unui contract de mesaj între `enrich-termene-company-base` și workerul AI.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-company-base-enrich-ai-text-structure\``.
