# ADR-FAMILY-e3-channels

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-channels |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `channels` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-channels` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Rutare și livrare mesaje în **AI Sales** (nu outreach E2): decizie canal, trimitere WhatsApp/email comercial.

## Dovezi confirmate în Cerniq

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e3:channel:route-decide` | `channel:route:decide` |
| `e3:channel:whatsapp-send` | `channel:whatsapp:send` |
| `e3:channel:email-send` | `channel:email:send` |

- Registry: `E3_CHANNEL_ROUTE_DECIDE`, `E3_CHANNEL_WHATSAPP_SEND`, `E3_CHANNEL_EMAIL_SEND`.

### Handover asociat (același perimetru produs)

| nodeKey | Coadă |
| --- | --- |
| `e3:handover:detect` | `handover:detect` |
| `e3:handover:context-load` | `handover:context:load` |

### Export graf (v2)

- **3** neuroni; exemple: `channel:email:send`, `channel:routing:decide`, `channel:whatsapp:send`.

### Reconciliere

- Graf `channel:routing:decide` vs runtime **`channel:route:decide`** — același rol, **denumire diferită**.

## Decizie de guvernanță familială

1. **Proprietar:** E3 Comms.
2. **Capabilitate:** canal optim post-decizie agent.
3. **Telemetrie:** **HIGH** pe livrare.

## Limită evidență

- Separare strictă E2 `outreach:*` vs E3 `channel:*`: din flux worker.
