# Sinapsă `enrich-termene-financials-enrich-ai-text-structure`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-financials-enrich-ai-text-structure` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-financials/enrich-termene-financials-enrich-ai-text-structure.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-financials` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-financials` | Contract: [`../../../neurons/E1/enrich--termene--financials.md`](../../../neurons/E1/enrich--termene--financials.md). **v2_queue:** `enrich:termene:financials`. |
| Destinație (graf) | `enrich-ai-text-structure` | Contract: [`../../../neurons/E1/enrich--ai--text-structure.md`](../../../neurons/E1/enrich--ai--text-structure.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

În **graf**, traseul «financials» depinde de **enrich-ai-text-structure**: planificarea include structurarea AI a textului sau datelor neuniforme în același macro-flux cu îmbogățirea financiară etichetată astfel în v2. Execuția concretă (ex. J1) se tratează în contractele neuron țintă, nu aici.

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
| **Runtime (ADR-0001)** | Sursă unificată cu bilanț în practică operațională — vezi contract neuron. |
| **Semantic (ADR-0002)** | Noduri E1; reconciliere graf ↔ catalog unde e cazul. |
| **Planificare** | v2 §7 — `enrich-termene-financials` → `enrich-ai-text-structure`. |

## Limite și reconcilieri

- Nu confunda nodul de planificare «financials» cu o coadă dedicată fără audit suplimentar.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-financials-enrich-ai-text-structure\``.
