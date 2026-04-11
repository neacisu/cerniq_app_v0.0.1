# ADR-FAMILY-e1-ingest

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-ingest |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `ingest` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-ingest` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **ingest** cuprinde punctele de intrare ale datelor brute în pipeline-ul E1: fișiere, webhook-uri, API, introducere manuală. Obiectiv: ingestie **controlată**, cu trasabilitate tenant/batch și fără bypass al normalizării ulterioare.

## Dovezi confirmate în Cerniq

### În cod și registry

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) (început fișier):
  - `INGEST_CSV: "ingest:csv"`
  - `INGEST_EXCEL: "ingest:excel"`
  - `INGEST_WEBHOOK: "ingest:webhook"`
  - `INGEST_MANUAL: "ingest:manual"`
  - `INGEST_API: "ingest:api"`
- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts): `e1:ingest:*` cu aceleași cozi BullMQ și descrieri (CSV, Excel, webhook, manual, API).

### În exportul de graf (plan master)

- **4** neuroni; exemple: `bronze:ingest:csv-parser`, `bronze:ingest:html-scraper`, `bronze:ingest:json-parser`, `bronze:ingest:pdf-extractor`.

### Reconciliere registry / export graf

- **Prefix runtime:** `ingest:*` (fără `bronze:`).
- **Denumiri graf:** `bronze:ingest:*` și tipuri diferite de sursă (HTML, JSON, PDF) — **nu** toate apar ca atare în snippet-ul auditat al registry-ului; cele cinci cozi de mai sus sunt confirmate pentru CSV/Excel/webhook/manual/API.
- **Limită:** `html-scraper`, `json-parser`, `pdf-extractor` din graf **nu** sunt confirmate ca nume de coadă în `queue-registry.ts` la audit; pot fi planificare viitoare sau mapate altfel (ex. același worker pe `ingest:csv`). Necesită verificare în workeri sau ADR fiu.

## Decizie de guvernanță familială

1. **Proprietar:** Platform Ingest + E1.
2. **Capabilitate:** intrare uniformă în pipeline cu corelare `tenantId` / `batchId` pentru observabilitate.
3. **Telemetrie:** span cognitive + evenimente Redis/SSE când `tenantId` este prezent (vezi `emitCognitiveEvent` în [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts)).
4. **Anomalii:** volume anormale per sursă, erori repetate de parsare, blocaje cozi.
5. **Guardrail:** validare antiviruș / mărime fișier / rate limit sunt responsabilități de platformă (în afara acestui ADR dacă nu sunt în codul citit).

## Aliniere la cercetare

Research-ul recomandă **Kafka + BullMQ** ca nerv dublu: ingestia poate alimenta mai întâi spine-ul de evenimente; în repo, **BullMQ este substratul de execuție** confirmat. Orice bridge Kafka → BullMQ pentru ingest rămâne **direcție arhitecturală** din planul master, nu afirmație despre fiecare worker în parte.

## Observabilitate

- API `/brain`: [apps/api/src/routes/cognitive-brain.ts](../../../../apps/api/src/routes/cognitive-brain.ts) — catalog, topologie, SSE evenimente, pause/resume.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — căutare `ingest:`.
- Sinapse din webhook-uri externe către ingest — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Tabel mapare publică graf `bronze:ingest:*` ↔ cozi `ingest:*` (sau închidere: graf actualizat).
- [ ] SLA și limite documentate per sursă.

## Research extern

- Opțional: model streaming Kafka — `https://kafka.apache.org/intro` (din plan master §0.3); verificare la nevoie la data lucrului.

## Limită evidență

- Handler-ii și schemele job pentru fiecare tip de fișier **nu** sunt extrase aici; audit în pachetele `workers/*` care înregistrează procesori pe `ingest:*`.
