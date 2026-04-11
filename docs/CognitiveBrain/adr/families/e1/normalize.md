# ADR-FAMILY-e1-normalize

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e1-normalize |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E1 |
| Familie | `normalize` |
| Plan master | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e1-normalize` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |

## Context

Familia **normalize** standardizează câmpuri fundamentale (nume, adresă, telefon, email) înainte de îmbogățire și deduplicare. Obiectiv: **interoperabilitate** (E.164, normalizare email) și consistență între surse.

## Dovezi confirmate în Cerniq

### În cod și registry

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts):
  - `NORMALIZE_NAME: "normalize:name"`
  - `NORMALIZE_ADDRESS: "normalize:address"`
  - `NORMALIZE_PHONE: "normalize:phone"`
  - `NORMALIZE_EMAIL: "normalize:email"`
- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):
  - `e1:normalize:name` → `normalize:name`
  - `e1:normalize:address` → `normalize:address`
  - `e1:normalize:phone` → `normalize:phone`
  - `e1:normalize:email` → `normalize:email`

### În exportul de graf (plan master)

- **4** neuroni; exemple: `silver:norm:address`, `silver:norm:company-name`, `silver:norm:email`, `silver:norm:phone-e164`.

### Reconciliere registry / export graf

- **Prefix runtime:** `normalize:*` (fără `silver:norm:`).
- **Semantică graf:** prefix `silver:norm:` sugerează strat argint; în cod, normalizarea este încă modelată ca `normalize:{field}`.
- **Diferență nume câmp:** graf `company-name` vs cod `name` — mapare explicită necesară în documentația de date sau în UI.

## Decizie de guvernanță familială

1. **Proprietar:** Data Quality E1.
2. **Capabilitate:** transformări deterministe unde e posibil; pentru cazuri ambigue, flag către îmbogățire sau HITL.
3. **Telemetrie:** span cognitive per `nodeKey` normalizare.
4. **Anomalii:** rate mare respingere validare, pattern-uri suspecte (spam, PII invalidă).
5. **Guardrail:** PII în mutații — redactare conform `DATA_MUTATION_PII_ALLOWLIST` în `cognitive-helpers.ts`.

## Aliniere la cercetare

Standardizarea reduce suprafața de halucinație pentru pașii LLM ulteriori (vezi [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — strat deterministic în jurul AI).

## Observabilitate

- Atribute span: `cognitive.nodeKey`, `cognitive.etapa` = 1, swimlane conform catalogului pentru aceste noduri.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — `normalize:name`, etc.
- Sinapse de la ingest către normalizare — [contracts/synapses/](../../contracts/synapses/).

## Criterii de acceptanță

- [ ] Specificație câmp-in/câmp-out per nod (sau referință la schema partajată).
- [ ] Teste unitare pentru E.164 și normalizare email.

## Research extern

- Nu obligatoriu.

## Limită evidență

- Regulile exacte de normalizare (biblioteci, locale RO) se citesc din implementarea workerului, nu din acest ADR.
