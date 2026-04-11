# ADR-FAMILY-e5-referral

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-referral |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `referral` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-referral` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Program referral GDPR: detectare, consimțământ, outreach prospect, tracking, recompense.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:referral:detect` | `referral:detect` |
| `e5:referral:consent-request` | `referral:consent:request` |
| `e5:referral:consent-confirm` | `referral:consent:confirm` |
| `e5:referral:outreach-prospect` | `referral:outreach:prospect` |
| `e5:referral:tracking-conversion` | `referral:tracking:conversion` |
| `e5:referral:reward-issue` | `referral:reward:issue` |
| `e5:referral:reward-notify` | `referral:reward:notify` |

### Export graf (v2)

- **10** neuroni; exemple: `campaign:cluster:launch`, `referral:consent:expire`, `referral:eligibility:check`, `referral:neighbor:approach`, `referral:potential:tag`.

### Reconciliere

- Graf: cozi suplimentare (`eligibility`, `neighbor:approach`, `campaign:cluster:launch`) — **nu** în lista registry de mai sus; **gap** sau etape în alte cozi.

## Decizie de guvernanță familială

1. **Proprietar:** E5 Growth.
2. **Capabilitate:** creștere organă cu respect GDPR.
3. **Telemetrie:** **HIGH** pe consimțământ și conversii.

## Limită evidență

- Mapare completă 10 noduri graf ↔ runtime: export + cod.
