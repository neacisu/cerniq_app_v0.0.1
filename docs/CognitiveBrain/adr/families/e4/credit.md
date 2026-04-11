# ADR-FAMILY-e4-credit

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e4-credit |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E4 |
| Familie | `credit` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e4-credit` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Credit scoring 100p: profil, date ANAF/bilanț/BPI, scor, limite, rezervări, refresh bulk, expirare rezervări.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e4:credit:profile-create` | `credit:profile:create` |
| `e4:credit:data-fetch-anaf` | `credit:data:fetch-anaf` |
| `e4:credit:data-fetch-bilant` | `credit:data:fetch-bilant` |
| `e4:credit:data-fetch-bpi` | `credit:data:fetch-bpi` |
| `e4:credit:score-calculate` | `credit:score:calculate` |
| `e4:credit:limit-calculate` | `credit:limit:calculate` |
| `e4:credit:limit-check` | `credit:limit:check` |
| `e4:credit:limit-reserve` | `credit:limit:reserve` |
| `e4:credit:limit-release` | `credit:limit:release` |

### Pipeline / cron

- `pipeline:credit:refresh-all`, `pipeline:reservation:expire` — în registry cu comentarii cron.

### Export graf (v2)

- **11** neuroni; exemple incluzând `credit:check:order`, `credit:data:fetch-dosare`, `credit:data:fetch-insolventa`.

### Reconciliere

- Graf: cozi suplimentare (`fetch-dosare`, `fetch-insolventa`, `check:order`) — **nu** în lista `QUEUES` principală citită; posibil planificare sau denumiri vechi.

## Decizie de guvernanță familială

1. **Proprietar:** E4 Risk.
2. **Capabilitate:** expunere controlată credit B2B.
3. **Telemetrie:** **CRITICAL** pe calcule scor.

## Limită evidență

- Mapare exactă noduri graf suplimentare ↔ cod: audit [workers/e4-postsale/](../../../../workers/e4-postsale/).
