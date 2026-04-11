# ADR-FAMILY-e1-hitl

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-hitl |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `hitl` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-hitl` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **hitl** în E1 acoperă neuronii care pun în legătură pipeline-ul de import cu **Human-in-the-loop**: escaladări, reluări după aprobare și, în planificarea pe graf, cozi de tip „approval pending”. Obiectiv: decizii cu impact mare sau ambigue nu traversează pipeline-ul fără punct de control uman, aliniat la ADR global privind HITL ca plan transversal.

## Dovezi confirmate în Cerniq

### În cod și registry

- Catalog semantic E1 HITL în [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `e1:hitl:escalate` → coadă `hitl:escalate`
  - `e1:hitl:resume` → coadă `hitl:resume`
- Registry [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `HITL_ESCALATION: "hitl:escalate"`, `HITL_RESUME_AFTER_APPROVAL: "hitl:resume"`, înregistrate în secțiunea pipeline E1 (comentariu „P — orchestrate … hitl-escalation, hitl-resume”).
- Alte cozi `hitl:*` există pentru E4/E5 (ex. `hitl:approval:*`); acestea **nu** sunt etapa E1 dar folosesc același prefix și strategie de retry `HITL` în registry.

### În exportul de graf (plan master)

- **1** neuron; exemplu: `pipeline:approval:pending`.

### Reconciliere registry / export graf

- Numele `pipeline:approval:pending` din export **nu** apare ca atare în `queue-registry.ts` la audit.
- Runtime-ul confirmat pentru E1 HITL este perechea **`hitl:escalate` / `hitl:resume`**, nu `pipeline:approval:pending`.
- **Consecință:** UI/graf poate folosi o etichetă de planificare; **autoritatea cozilor** rămâne registry + catalog.

## Decizie de guvernanță familială

1. **Proprietar:** transversal HITL + Platform E1 (escaladări în import).
2. **Capabilitate:** escaladare controlată către operator uman și reluare deterministică după aprobare, cu corelare trace (`traceId`, `spanId`, `correlationId` în evenimente cognitive).
3. **Telemetrie:** span-uri `cognitive:{nodeKey}` cu atribute standard din `runCognitiveSpan` în [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts).
4. **Anomalii:** cozi blocate, timp crescut până la `resume`, inconsistență între stare aprobare și job-uri BullMQ.
5. **Guardrail:** HITL este **infrastructură de control**; nu se ocolește prin flag-uri locale în worker fără ADR.

## Aliniere la cercetare

Planul de research recomandă **întreruperi** în lanțuri cognitive pentru revizie umană și **politici** pe încredere. Pentru Cerniq, HITL rămâne ancorat în cozi și API-uri existente; LangGraph `interrupt()` sau MCP sunt **direcții opționale** viitoare, neconfirmate ca implementare în acest repo pentru E1.

## Observabilitate

- Evenimente: `emitCognitiveEvent` cu `tenantId` obligatoriu pentru publicare Redis/SSE (vezi comentarii în `cognitive-helpers.ts`).
- API `/brain`: [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) folosește `COGNITIVE_NODE_CATALOG` și propagare pause — relevant pentru control operațional în jurul nodurilor HITL.

## Contracte și indexare

- Contracte neuron: căutare `hitl` sub [contracts/neurons/](../../contracts/neurons/).
- Sinapse: legături din pipeline și din ingest către escaladare — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Fiecare job `hitl:escalate` are cale documentată până la `hitl:resume` sau terminare explicită.
- [ ] Graf export sau UI folosesc **aceleași** nume de coadă ca registry sau un ADR de mapare publică.
- [ ] Teste integrare pe flux escaladare + resume (unde există worker).

## Research extern

- Nu obligatoriu pentru acest ADR (comportament ancorat în cod).

## Limită evidență

- Semantica exactă a unui nod „`pipeline:approval:pending`” în export **nu** este mapată la o coadă din registry în auditul curent; necesită fie **redenumire în graf**, fie **adăugare coadă** în registry dacă este încă necesară.
