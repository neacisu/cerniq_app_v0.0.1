# ADR-FAMILY-e1-enrichment

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-enrichment |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `enrichment` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-enrichment` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **enrichment** agregă îmbogățirea datelor din surse externe și interne în E1: ANAF/Termene/ONRC, descoperire email, telefon, scraping legal și web, geo, agri, plus validări CUI. Este cea mai întinsă familie din graf (36 de neuroni în export) și corespunde în cod unui **bloc mare de cozi** înainte de pipeline-ul AI dedicat (`ai:*`) și înainte de dedup/scoruri.

## Dovezi confirmate în Cerniq

### În cod și registry

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) definește, pentru E1, constante pentru:
  - **ANAF / bronze:** `enrich:bronze:anaf`, `enrich:anaf:full`; cozi istorice `enrich:anaf:fiscal-status`, `tva-status`, `efactura`, `datorii`, `caen` marcate **`@deprecated`** în favoarea `enrich:anaf:full` (comentarii în cod).
  - **Validare:** `validate:cui:mod11`, `validate:cui:anaf`.
  - **Termene:** `enrich:termene:balance`, `risk`, `dosare`, `actionari`.
  - **ONRC:** `enrich:onrc:data`, `administratori`, `sedii`.
  - **Email:** `discover:email:hunter`, `hunter-verify`, `zerobounce`, `pattern`, `generate`; `enrich:email:enricher`.
  - **Telefon:** `enrich:phone:normalize`, `hlr`, `carrier`.
  - **Scraping:** `scrape:legal:daj`, `legal:anif`, `website:finder`, `website:contact-page`.
  - **Geo:** `geo:geocode:nominatim`, `zones:postgis`, `proximity`.
  - **Agri:** `agri:apia`, `ouai`, `cooperative`, `culturi`, `animale`.
- Același fișier, secțiunea `QUEUE_CONFIG` pentru E1 (în jurul liniilor 699–744), înregistrează **concurențe** și **provider** (`anaf`, `termene`, `onrc`, `hunter`, etc.) pentru aceste cozi.

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) clasifică majoritatea acestor neuroni în swimlane-uri:
  - **`enrichment-fiscal`** (ANAF, validări CUI legate de fiscalitate),
  - **`enrichment-external`** (Termene, ONRC, email, telefon, scrape, geo, agri).

Comentariul din antetul catalogului menționează **252** intrări statice catalogate la nivel monorepo și **65** noduri E1; familia `enrichment` din graf este un **subset conceptual** al acestui inventar (fără a coincide numeric cu „36” din cod fără reconciliere manuală).

### În exportul de graf (plan master)

- **36** neuroni; exemple: `enrich:anaf:address`, `enrich:anaf:caen`, `enrich:anaf:efactura`, `enrich:anaf:fiscal-status`, `enrich:anaf:tva-status`, `enrich:anif:ouai-lookup`.

### Reconciliere registry / export graf

- **Granularitate ANAF:** graful listează mai multe cozi ANAF discrete; în cod, `enrich:anaf:full` **unifică** fluxul, iar cozile vechi sunt **deprecate** — graful trebuie actualizat sau mapat explicit.
- **ANIF vs cod:** exemplu graf `enrich:anif:ouai-lookup` vs cod `agri:ouai` — **nu** asuma identitate fără mapare; pot fi același domeniu (OUAI) sub prefix diferit.
- **Adresă ANAF:** `enrich:anaf:address` din graf **nu** apare ca string separat în constantele citite din `queue-registry.ts`; poate fi absorbit în `enrich:anaf:full` sau alt flux — **Limită evidență** până la audit worker.

## Decizie de guvernanță familială

1. **Proprietar:** Data Enrichment E1 + integrări externe.
2. **Capabilitate:** îmbogățire cu rate limiting per provider, trasabilitate sursă și respectarea limitelor API.
3. **Telemetrie:** span `cognitive:{nodeKey}`; pentru apeluri model/LLM acolo unde apar, aliniere treptată la convențiile OTel GenAI (`https://opentelemetry.io/docs/specs/semconv/gen-ai/`, verificat2026-04-11).
4. **Anomalii:** 429/5xx de la furnizori, degradare calitate, costuri API.
5. **Guardrail / HITL:** îmbogățiri cu impact legal (fiscal, litigii) pot declanșa revizie umană conform politicii globale.

## Aliniere la cercetare

- [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md): ieșiri structurate și **încredere** pentru decizii; pentru integrări API, pattern-ul **deterministic envelope** se aplică prin validare schema + politici, nu prin text liber.
- vLLM structured outputs (dacă un subflux folosește LLM): documentație `https://docs.vllm.ai/en/latest/features/structured_outputs.html` (2026-04-11).

## Observabilitate

- Provider tags în configurația cozilor (`withProvider`) — utile pentru dashboards pe furnizor.
- PII: mutații înregistrate cu redactare conform [workers/shared/src/cognitive-helpers.ts](../../../../workers/shared/src/cognitive-helpers.ts).

## Contracte și indexare

- **Nu** enumerăm aici miile de contracte sinapsă; indexare:
  - [contracts/neurons/](../../contracts/neurons/) — filtrare după prefix `enrich:`, `discover:`, `validate:cui`, `scrape:`, `geo:`, `agri:`.
  - [contracts/synapses/](../../contracts/synapses/) — legături din ingest/normalizare către îmbogățire.

## Criterii de acceptanță

- [ ] Tabel mapare **graf → coadă runtime** pentru fiecare prefix `enrich:anaf:*` și pentru ANIF/OUAI.
- [ ] Deprecations ANAF propagate în documentația de planificare (graf).
- [ ] Runbook incident per furnizor critic (ANAF, Termene, etc.).

## Research extern

| Sursă | Data acces |
| --- | --- |
| `https://opentelemetry.io/docs/specs/semconv/gen-ai/` | 2026-04-11 |
| `https://docs.vllm.ai/en/latest/features/structured_outputs.html` | 2026-04-11 |

## Limită evidență

- **36** din graf vs **număr efectiv** de cozi distincte în registry pentru același domeniu: necesită reconciliere manuală sau script de diff între export graf și `QUEUES`.
- Handler-ii și SLA per furnizor **nu** sunt detaliați în acest ADR de familie.
