# ADR-FAMILY-e1-monitor

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-monitor |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `monitor` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-monitor` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **monitor** din E1 vizează observabilitatea și sincronizarea stării pipeline-ului de import: sănătate cozi, metrici, aliniere rate. În catalog, `e1:pipeline:monitor` este tip **`AttentionNeuron`** (atenție operațională asupra stării pipeline), swimlane `pipeline-control`.

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `e1:pipeline:monitor` → coadă **`pipeline:monitor`**, descriere „Monitorizare pipeline principal E1”, `NeuronType.MetaNeuron`, swimlane `pipeline-control`, severitate ridicată în catalog.
- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts):
  - `PIPELINE_MONITOR: "pipeline:monitor"` în blocul E1; concurență **1** în `QUEUE_CONFIG` (secțiune comentată „P — Pipeline Control”).

### În exportul de graf (plan master)

- **2** neuroni; exemple: `pipeline:monitor:health`, `pipeline:monitor:rate-sync`.

### Reconciliere registry / export graf

- **O singură coadă** `pipeline:monitor` în runtime vs **două** etichete distincte în graf (`health`, `rate-sync`).
- **Ipoteză de integrare (neconfirmată fără citire worker):** ambele responsabilități pot fi într-un singur procesator sau sub-job-uri interne; **nu** înlocuiește nevoia de mapare explicită în documentație sau de split în cozi separate dacă operațiunile cer izolare.

## Decizie de guvernanță familială

1. **Proprietar:** SRE / Platform Cognitive.
2. **Capabilitate:** supraveghere sănătate E1 și semnalare proactivă (metrici, heartbeat).
3. **Telemetrie:** span-uri cognitive + metrici Prometheus la nivel infrastructură (în afara scope-ului acestui fișier); evitare cardinalitate excesivă pe etichete (vezi [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md)).
4. **Anomalii:** cozi stagnate, diferențe rate sursă/țintă, pierdere evenimente.
5. **Guardrail:** monitorul **nu** modifică date business fără alt neuron explicit; orice acțiune correctivă trebuie trasată.

## Aliniere la cercetare

Dual-path recomandat: metrici istorice + flux live (WebSocket/SSE) pentru dashboard-uri; în Cerniq, API-ul `/brain` oferă SSE pentru evenimente cognitive — complementar, nu înlocuitor, pentru metrici de sistem.

## Observabilitate

- Evenimente cognitive și `pipeline:monitor` ca `nodeKey` canonic în catalog.
- API: [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts).

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `pipeline:monitor`.
- Sinapse din orchestrator și erori — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Document care explică dacă `health` și `rate-sync` sunt sub-taskuri ale aceluiași worker sau cer cozi noi.
- [ ] Alerte Grafana/Loki legate de `pipeline:monitor` (dacă există în infra).

## Research extern

- OTel GenAI / metrics generale: `https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-metrics.md` — 2026-04-11 (pentru corelare viitoare cu apeluri LLM în același batch).

## Limită evidență

- Implementarea internă a workerului pentru `pipeline:monitor` **nu** este citită în detaliu în acest ADR.
