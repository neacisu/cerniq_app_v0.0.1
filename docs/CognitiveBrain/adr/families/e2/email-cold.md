# ADR-FAMILY-e2-email-cold

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-email-cold |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `email-cold` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-email-cold` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **email-cold** gestionează trimiterea și administrarea campaniilor cold email (Instantly și cozi canonic `email:cold:*`, `q:email:cold`).

## Dovezi confirmate în Cerniq

### În cod și registry

- [packages/shared/src/cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts):

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:email:cold-send` | `q:email:cold` |
| `e2:email:cold-campaign-create` | `email:cold:campaign:create` |
| `e2:email:cold-campaign-pause` | `email:cold:campaign:pause` |
| `e2:email:cold-analytics` | `email:cold:analytics:fetch` |
| `e2:email:cold-lead-status` | `email:cold:lead:status` |

- Registry: `EMAIL_COLD`, `EMAIL_COLD_CAMPAIGN_CREATE`, `EMAIL_COLD_CAMPAIGN_PAUSE`, `EMAIL_COLD_ANALYTICS_FETCH`, `EMAIL_COLD_LEAD_STATUS` — aceleași string-uri.

### În exportul de graf (v2)

- **7** neuroni; exemple: `email:cold:add-to-campaign`, `email:cold:analytics:fetch`, `email:cold:campaign:create`, `email:cold:campaign:pause`, `email:cold:lead:status`, `q:email:cold`.

### Reconciliere registry / catalog / graf

| Observație |
| --- |
| Graf v2 citește `email:cold:add-to-campaign`; **nu** apare ca literal în `queue-registry.ts` la audit — posibil etichetă graf / coadă istorică sau mapare în worker; **gap** documentat. |
| Catalog folosește prefix `e2:email:cold-*` pentru `nodeKey`; cozile runtime rămân `email:cold:*` și `q:email:cold`. |

## Decizie de guvernanță familială

1. **Proprietar:** Outreach E2 / Growth.
2. **Capabilitate:** campanii cold, sincronizare status lead, metrici.
3. **Telemetrie:** **HIGH** pe trimitere; conformitate deliverability legată de familia `monitoring`.
4. **Anomalii:** bounce ridicat, campanii blocate provider.
5. **Guardrail:** consimțământ și politici anti-spam — responsabilitate legală + produs.

## Contracte și indexare

- [contracts/neurons/](../../contracts/neurons/) — cozi de mai sus.

## Criterii de acceptanță

- [ ] Reconciliere explicită `email:cold:add-to-campaign` ↔ cod sau marcat „doar graf”.

## Limită evidență

- Semantica exactă a cozii `add-to-campaign` din graf: **neconfirmată** în registry.
