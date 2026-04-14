# Sinapsă `enrich-termene-company-base-enrich-ai-contact-parse`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `enrich-termene-company-base-enrich-ai-contact-parse` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/enrich-termene-company-base/enrich-termene-company-base-enrich-ai-contact-parse.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `enrich-termene-company-base` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `enrich-termene-company-base` | Traseu / neuron Termene în graf. Contract: [`../../../neurons/E1/enrich--termene--company-base.md`](../../../neurons/E1/enrich--termene--company-base.md). **v2_queue:** `enrich:termene:company-base`. |
| Destinație (graf) | `enrich-ai-contact-parse` | Traseu AI în graf. Contract neuron: [`../../../neurons/E1/enrich--ai--contact-parse.md`](../../../neurons/E1/enrich--ai--contact-parse.md). **v2_queue:** `enrich:ai:contact-parse`. **Runtime:** prefix `enrich:ai:*` vs cozi `ai:*` — [`../../../adr/families/e1/ai-enrichment.md`](../../../adr/families/e1/ai-enrichment.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie în pipeline (export-grounded)

În **planificare**, muchia **`dependency`** ordonează topologic traseul Termene «company-base» în raport cu traseul **enrich-ai-contact-parse** (structurare / parsare contact din date neuniforme în modelul v2). **Nu** afirmăm shape de mesaj sau ordinea efectivă de execuție în cod: exportul **nu** encodează payload. **Dovadă runtime** pentru capetele muchiei: contractele neuron (sursă cu gap Termene; țintă cu mapare discutată spre `ai:structure:xai`).

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
| **Runtime (ADR-0001)** | Contract neuron sursă: fără `enrich:termene:company-base` în registry. Contract neuron țintă: fără `enrich:ai:contact-parse` literal în registry. |
| **Semantic (ADR-0002)** | E1 enrichment vs E1 AI — ambele sub orchestrarea E1; detalii în ADR familii. |
| **Planificare** | v2 §7 — `enrich-termene-company-base` → `enrich-ai-contact-parse`, `dependency`. |

## Limite și reconcilieri

- Orice **rezolvare** a dependenței în cod (când și cum se apelează AI după Termene) depășește câmpurile sinapsei din export; se documentează în workeri / ADR, nu prin completări aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`enrich-termene-company-base-enrich-ai-contact-parse\``.
