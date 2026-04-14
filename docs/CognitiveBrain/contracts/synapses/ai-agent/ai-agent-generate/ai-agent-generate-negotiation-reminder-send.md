# Sinapsă `ai-agent-generate-negotiation-reminder-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-agent-generate-negotiation-reminder-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-agent-generate/ai-agent-generate-negotiation-reminder-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-agent-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-agent-generate` | **Planificare:** traseu `ai-agent-generate`. **Matrix:** `ai:agent:generate` → [`../../../neurons/E3/ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md). Contractul neuron: **gap** handler/registry pentru coada literală v2; nu afirma execuție BullMQ sub acest nume fără reconciliere. |
| Destinație (graf) | `negotiation-reminder-send` | **Matrix:** `negotiation:reminder:send` → [`../../../neurons/E3/negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). **Registry:** `E3_NEGOTIATION_REMINDER_SEND` → `negotiation:reminder:send`. **Catalog:** perechi `negotiation:reminder:send` / `e3:negotiation:reminder-send` (vezi contract neuron). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În v2 §7, dependența leagă planificarea traseului de generare agent de nodul `negotiation-reminder-send`. Semantica exportată este **„sinapsă canonică de pipeline”** — adică existența unei legături structurale între acești pași în graf, fără schemă de mesaj sau ordine de scheduling în export. Din perspectivă business (interpretare conservatoare): planificarea spune că fluxul care include generarea comportamentului agentului este poziționat înainte sau în dependență față de trimiterea memento-urilor în negociere; mecanismul exact (cron, eveniment, coadă) este în contractul neuron destinație și în cod, nu în câmpurile sinapsei.

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

- **Runtime (ADR-0001):** ținta este aliniată la registry în mod documentat în [`negotiation--reminder--send.md`](../../../neurons/E3/negotiation--reminder--send.md). Sursa: vezi gap în [`ai--agent--generate.md`](../../../neurons/E3/ai--agent--generate.md).
- **Semantic (ADR-0002):** metadate pentru `negotiation:reminder:send` din catalog; pentru sursă poate lipsi `nodeKey` pentru `ai:agent:generate`.
- **Planificare:** muchie `dependency` în graf — sursa pentru **ordinea conceptuală** a pașilor, nu pentru payload.

## Limite și reconcilieri

- Slug-uri graf vs cozi `:` — aceeași disciplină ca în registrul §7.
- Orice ID intern de negociere sau canal de trimitere este **în afara** câmpurilor exportului sinapsei.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-agent-generate-negotiation-reminder-send\``.
