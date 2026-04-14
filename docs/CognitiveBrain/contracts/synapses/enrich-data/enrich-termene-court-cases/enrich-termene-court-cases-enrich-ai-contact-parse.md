# Sinapsă `enrich-termene-court-cases-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-court-cases-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-court-cases/enrich-termene-court-cases-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-court-cases` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-court-cases` | Contract: [`../../../neurons/E1/enrich--termene--court-cases.md`](../../../neurons/E1/enrich--termene--court-cases.md). **v2_queue:** `enrich:termene:court-cases`. |
| Destinație (graf) | `enrich-ai-contact-parse` | Contract: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **v2_queue:** `enrich:ai:contact-parse`. ADR `enrich:ai:*`: [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

În **graf**, dependența leagă traseul dosarelor Termene (`court-cases` în v2) de traseul **enrich-ai-contact-parse**. Sens de business la nivel de planificare: datele de dosar (inclusiv metadate potențial utile pentru contact) sunt plasate într-un flux care include și extragerea/structurarea de contact prin AI, conform topologiei exportate. **Fără** schemă de mesaj din export.

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
| **Runtime (ADR-0001)** | Contract neuron sursă: `court-cases` v2 ↔ `enrich:termene:dosare` în registry. Contract neuron destinație: fără literal `enrich:ai:contact-parse` în registry. |
| **Semantic (ADR-0002)** | E1 — ambele capete în strat enrichment / AI conform v2. |
| **Planificare** | v2 §7 — `dependency` explicită. |

## Limite și reconcilieri

- Detaliile handler (ex. ce câmp dosar alimentează AI) **nu** sunt în registrul sinapsei; reconciliere în cod sau contract neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-court-cases-enrich-ai-contact-parse\``.
