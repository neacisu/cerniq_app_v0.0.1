# Sinapsă `ai-tool-execute-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-tool-execute-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-tool-execute/ai-tool-execute-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-tool-execute` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-tool-execute` | **Planificare:** traseu `ai-tool-execute`. **Matrix:** `ai:tool:execute` → [`../../../neurons/E3/ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md). **Gap** coadă dedicată în registry la audit; execuție tool modelată altfel în cod (C14). |
| Destinație (graf) | `negotiation-reminder-send` | **Matrix:** `negotiation:reminder:send` → [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). **Registry:** `E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`. **Catalog:** perechi documentate în contractul neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă în planificare traseul `ai-tool-execute` de trimiterea memento-urilor de negociere. Textul v2 rămâne la **„sinapsă canonică de pipeline”** — adică existența unei legături structurale, nu a unui contract de mesaj. Interpretare conservatoare: fluxul care include execuția tool-urilor agentului este declarat în dependență față de pasul de reminder; canalul și cronologia exacte stau în implementarea neuronului destinație.

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

- **Runtime (ADR-0001):** ținta aliniată la registry în contractul neuron; sursa: gap documentat în [`ai--tool--execute.md`](../../../neurons/E3/ai--tool--execute.md).
- **Semantic (ADR-0002):** metadate pentru `negotiation:reminder:send`; pentru sursă, fără `nodeKey` la auditul citat.
- **Planificare:** `dependency` în graf — ordine conceptuală a pașilor, fără payload în export.

## Limite și reconcilieri

- Slug graf vs cozi `:` — aceeași disciplină ca în registrul §7.
- Orice legătură cauzală între un apel de tool și un reminder nu reiese din sinapsă; revine la cod și la contractele neuron.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-tool-execute-negotiation-reminder-send\``.
