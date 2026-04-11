# ADR-FAMILY-e5-content

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e5-content |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E5 |
| Familie | `content` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e5-content` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Drip content nurturing: programare, execuție pas, template, tracking livrare.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e5:content:drip-schedule` | `content:drip:schedule` |
| `e5:content:drip-execute` | `content:drip:execute` |
| `e5:content:template-render` | `content:template:render` |
| `e5:content:delivery-track` | `content:delivery:track` |

### Export graf (v2)

- **7** neuroni; exemple incluzând `content:drip:send`, `content:personalize:ai`, `email:cold:add-to-campaign`, `wa:send:initial`.

### Reconciliere

| Observație |
| --- |
| Graf amestecă cozi **E5** cu cozi tipice **E2** (`email:cold:add-to-campaign`, `wa:send:initial`) — posibil agregare grafică cross-etapă; **nu** inferăm același worker fără cod. |
| `content:drip:send` (graf) vs `content:drip:execute` (registry) — posibil același pas sub nume diferit. |

## Decizie de guvernanță familială

1. **Proprietar:** E5 Content.
2. **Capabilitate:** nurturing fără suprasolicitare.
3. **Telemetrie:** open/click dacă disponibile.

## Limită evidență

- Rolul exact al cozilor E2 citate în familia `content` din graf: **neclar**.
