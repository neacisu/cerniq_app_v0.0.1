# ADR-FAMILY-e2-human

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e2-human |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E2 |
| Familie | `human` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e2-human` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Familia **human** (E2) implementează HITL pentru outreach: cozi review, takeover, aprobare mesaj, audit. v2 **ADR-0008** cere convergență către motorul polimorf de aprobare; cozile E2 rămân puncte de intrare operaționale.

## Dovezi confirmate în Cerniq

### Catalog (exemple)

| nodeKey | Coadă BullMQ |
| --- | --- |
| `e2:human:review-queue` | `human:review:queue` |
| `e2:human:review-assign` | `human:review:assign` |
| `e2:human:takeover-initiate` | `human:takeover:initiate` |
| `e2:human:takeover-complete` | `human:takeover:complete` |
| `e2:human:approve-message` | `human:approve:message` |
| `e2:human:review-escalation` | `human:review:escalation` |
| `e2:human:audit-log` | `human:review:audit-log` |

### Registry

- `HUMAN_*`, `HITL_SLA_ENFORCE` (`hitl:sla:enforce`) — SLA review separat semantic de aprobare mesaj (comentariu în registry).

### Export graf (v2)

- **4** neuroni; exemple: `human:approve:message`, `human:review:queue`, `human:takeover:complete`, `human:takeover:initiate`.

### Reconciliere

- Catalog `e2:human:audit-log` → coadă `human:review:audit-log`; graf poate omite prefixe — aliniere prin registry.

## Decizie de guvernanță familială

1. **Proprietar:** Outreach + Platform HITL.
2. **Capabilitate:** control uman asupra mesajelor și takeover canal.
3. **Telemetrie:** **CRITICAL** pe escaladări; SLA din v2 ADR-0008 — **verificare** în implementarea efectivă.
4. **Guardrail:** toate căile de outbound critic trec prin politica HITL.

## Aliniere v2

- [v2 — ADR-0008](../../v2_cerniq_cognitive_brain_master_implementation_plan.md): convergență semantică HITL E1–E5; **dovezi cozi** E2 în registry de mai sus.

## Limită evidență

- Mapare end-to-end către tabelele unificate HITL (dacă diferă de cozi BullMQ): necesită audit aplicație/API.
