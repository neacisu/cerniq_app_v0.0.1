# ADR-FAMILY-e1-dedup

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-dedup |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `dedup` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-dedup` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **dedup** tratează deduplicarea entităților în E1: potrivire **exactă** și **fuzzy**, cu impact direct asupra calității lead-urilor și a integrității downstream. În catalog, neuronii sunt în swimlane-ul **`dedup-scoring`**, împreună cu scoreri și agregări de calitate.

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `e1:dedup:exact` → `dedup:exact` — „Deduplicare prin potrivire exactă (CUI, email)”, `NeuronType.AssociativeNeuron`, swimlane `dedup-scoring`.
  - `e1:dedup:fuzzy` → `dedup:fuzzy` — „Deduplicare prin potrivire fuzzy (Levenshtein, n-grame)”, același swimlane.
- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): `DEDUP_EXACT: "dedup:exact"`, `DEDUP_FUZZY: "dedup:fuzzy"`; configurate în blocul E1 cu concurență 10 / 5.

### În exportul de graf (plan master)

- **2** neuroni; exemple: `silver:dedup:entity-resolve`, `silver:dedup:fuzzy-match`.

### Reconciliere registry / export graf

- Prefix **runtime:** `dedup:*` (fără `silver:`).
- Nume **graf:** `silver:dedup:*` — diferență de **strat semantic** (argint) vs **prefix efectiv** în cod.
- **Consecință:** documentația operațională și dashboard-urile trebuie să afișeze **coada BullMQ canonică** (`dedup:exact`, `dedup:fuzzy`) ca sursă de adevăr pentru execuție.

## Decizie de guvernanță familială

1. **Proprietar:** Data Quality E1.
2. **Capabilitate:** reducerea duplicatelor cu două moduri complementare (exact / fuzzy), cu trasabilitate decizii.
3. **Telemetrie:** span-uri cognitive standard; evenimente pentru fuziuni/respingeri.
4. **Anomalii:** creștere bruscă fuzzy fără corespondent exact, rate false-positive.
5. **Guardrail / HITL:** fuziuni cu impact contractual sau financiar pot necesita escaladare (familia `hitl`); politica exactă este transversală.

## Aliniere la cercetare

Din [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md): arhitecturi centralizate reduc amplificarea erorilor în rețele mari de neuroni — deduplicarea corectă în E1 este **barieră** împotriva propagării erorilor în E2–E3.

## Observabilitate

- Instrumentare prin [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts) (`cognitive.nodeKey`, `cognitive.swimlane` = `dedup-scoring`, `cognitive.etapa` = 1).

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — căutare `dedup:exact`, `dedup:fuzzy`.
- Sinapse către scoreri (`score:*`) și pipeline — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Reguli de potrivire (câmpuri cheie, praguri fuzzy) documentate în contracte sau în ADR fiu.
- [ ] Teste care fixează comportamentul la coliziune și la lipsă date.

## Research extern

- Nu este necesar pentru acest ADR.

## Limită evidență

- Detaliul handler-ului (payload job, scriere DB) nu este exhaustiv în acest fișier; se obține din codul workerului care înregistrează procesorul pentru `dedup:*`.
