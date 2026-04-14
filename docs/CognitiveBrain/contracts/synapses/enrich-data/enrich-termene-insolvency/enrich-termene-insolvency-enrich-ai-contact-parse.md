# Sinapsă `enrich-termene-insolvency-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-insolvency-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-insolvency/enrich-termene-insolvency-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-insolvency` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-insolvency` | Contract: [`../../../neurons/E1/enrich--termene--insolvency.md`](../../../neurons/E1/enrich--termene--insolvency.md). **v2_queue:** `enrich:termene:insolvency`. |
| Destinație (graf) | `enrich-ai-contact-parse` | Contract: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). ADR: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

Dependența leagă în **graf** traseul «insolvency» de **enrich-ai-contact-parse**. În planificare, acest lucru indică faptul că fluxul cognitiv include atât modularea insolvenței (în sensul nodului exportat), cât și extragerea/structurarea de contact prin AI; **nu** se specifică mecanismul de date între ele în registrul sinapsei.

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
| **Runtime (ADR-0001)** | Sursă: fără coadă dedicată; semnale în alte procesoare (dosare, ANAF) — vezi contract neuron. Pentru țintă: fără literal `enrich:ai:contact-parse` în registry. |
| **Semantic (ADR-0002)** | E1 — familii din v2 pentru ambele capete. |
| **Planificare** | v2 §7 — `dependency`. |

## Limite și reconcilieri

- Nu extrapola din această muchie o singură sursă canonică de adevăr pentru starea de insolvență; vezi contract neuron sursă.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-insolvency-enrich-ai-contact-parse\``.
