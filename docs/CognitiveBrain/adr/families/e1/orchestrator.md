# ADR-FAMILY-e1-orchestrator

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-orchestrator |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `orchestrator` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-orchestrator` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **orchestrator** coordonează avansarea pipeline-ului E1: orchestrare principală, promovări între straturi (bronze→silver, silver→gold) și gestionarea erorilor la nivel de flux. Este punctul **executiv** al importului în modelul CoALA/MAPE-K discutat în research (supervizare etapă).

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) (secțiunea „P — Pipeline Control”):

| nodeKey | Coadă BullMQ | Rol (extras) |
| --- | --- | --- |
| `e1:pipeline:orchestrate` | `pipeline:orchestrate` | Orchestrare pipeline principal E1 |
| `e1:pipeline:promote-gold` | `pipeline:promote:gold` | Promovare Silver → Gold |
| `e1:pipeline:promote-bronze-silver` | `pipeline:promote:bronze-silver` | Promovare Bronze → Silver |
| `e1:pipeline:monitor` | `pipeline:monitor` | Monitorizare (și familia monitor) |
| `e1:pipeline:error-handler` | `pipeline:error-handler` | Gestionare erori pipeline |

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts): constante `PIPELINE_ORCHESTRATE`, `PIPELINE_PROMOTE_TO_GOLD`, `PIPELINE_PROMOTE_BRONZE_SILVER`, `PIPELINE_MONITOR`, `PIPELINE_ERROR_HANDLER` cu aceleași valori string; concurențe în `QUEUE_CONFIG` (orchestrate 20, promote-gold 10, promote-bronze-silver 1, monitor 1, error-handler 10).

### În exportul de graf (plan master)

- **2** neuroni; exemple: `pipeline:orchestrator:advance`, `pipeline:orchestrator:start`.

### Reconciliere registry / export graf

- **Denumiri diferite:** graf `pipeline:orchestrator:*` vs runtime `pipeline:orchestrate` + cozi de promovare separate.
- **Consecință:** „start” și „advance” din graf pot corespunde **fazelor logice** implementate în `pipeline:orchestrate` sau în sub-job-uri; **nu** există în registry la audit cozi numite `pipeline:orchestrator:start`.

## Decizie de guvernanță familială

1. **Proprietar:** Cognitive OS / Platform E1.
2. **Capabilitate:** control avansare și promovare cu idempotență și vizibilitate în `/brain`.
3. **Telemetrie:** span **CRITICAL** pe intrările catalogului pentru orchestrare și promovare.
4. **Anomalii:** promovări parțiale, deadlock între straturi, erori ne-tratate în `pipeline:error-handler`.
5. **Guardrail:** promovarea la Gold fără validări necesare este o decizie de produs — documentată separat.

## Aliniere la cercetare

- [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md): **FlowProducer** / DAG-uri BullMQ pentru orchestrare intra-serviciu; direcție de evoluție, **nu** afirmație că toate DAG-urile sunt deja migrate.
- Kafka spine: direcție din plan master; execuția curentă rămâne ancorată în **BullMQ** confirmat.

## Observabilitate

- `propagatePause` și utilitare heartbeat import din [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) (import din `@cerniq/worker-shared`) — relevant pentru control flux.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `pipeline:orchestrate`, `pipeline:promote:*`, `pipeline:error-handler`.
- Sinapse între toate familiile E1 — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Diagramă stări (bronze/silver/gold) sincronizată cu numele cozilor reale.
- [ ] Runbook pentru oprire sigură (pause) și reluare.

## Research extern

- Nu obligatoriu.

## Limită evidență

- Maparea exactă „start/advance” (graf) ↔ apeluri interne în worker **necesită** citire cod procesor `pipeline:orchestrate`.
