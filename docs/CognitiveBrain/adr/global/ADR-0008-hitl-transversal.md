# ADR-0008 — HITL ca plan transversal

| Câmp | Valoare |
| --- | --- |
| ID | ADR-0008 |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Nivel | Global |
| Plan v2 | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §3 «ADR-0008 — HITL as transversal control plane» |
| Plan legacy | [cerniq_cognitive_brain_master_implementation_plan.md](../../cerniq_cognitive_brain_master_implementation_plan.md) |
| Research | [cerniq_nuronal_research_base.md](../../cerniq_nuronal_research_base.md) — supraveghere umană, bounded autonomy |
| Fișiere autoritate | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts), [apps/api/src/routes/enrichment.ts](../../../../apps/api/src/routes/enrichment.ts) |

## Context

HITL (human-in-the-loop) trebuie să fie **transversal** pe E1–E5: aceleași semantici de aprobare, audit și SLA, nu tabele locale inconsecvente. v2 leagă acest obiectiv de **LangGraph** (`interrupt` / `Command(resume=...)`) și SLA per criticitate.

## Decizie (canonică din v2)

- HITL rămâne **canonic transversal**; aprobările converg spre un **motor polimorfic unificat** cu SLA și pistă de audit.
- **LangGraph 1.0:** `interrupt()` pentru pauză durabilă; reluare cu decizie umană (APPROVE/REJECT/MODIFY).
- **SLA țintă (v2):** CRITICAL 2h, HIGH 4h, MEDIUM 8h, LOW 24h, cu escaladare automată.

## Dovezi în implementarea Cerniq

### Cozi și prefixe în registry (implementat)

- [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) — exemple verificate la grep:
  - E1: `hitl:escalate`, `hitl:resume`, `human:review:*`, `human:takeover:*`, `human:approve:message`, `hitl:sla:enforce`, …
  - E3: `human:escalate`, `human:takeover`, `human:approve`
  - E4: `hitl:approval:*`, `hitl:investigation:payment`, `hitl:task:resolve`, `hitl:escalation:overdue`, …
  - E5: `winback:escalate:hitl`, `hitl:winback:review`, `hitl:complaint:review`
- Strategie retry: ramură dedicată pentru nume care încep cu `hitl:` ([workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) — comentariu în cod).

### API aprobări (implementat)

- [apps/api/src/routes/enrichment.ts](../../../../apps/api/src/routes/enrichment.ts) — rute sub namespace-ul etapei 1 (tag-uri `etapa1-approvals`): listare, statistici, detaliu, assign, **decide** («resume pipeline» în summary). Folosește `approvalService` / `approvalTasks` din `@cerniq/db`.

### LangGraph

- Căutare `langgraph`, `LangGraph` în `*.ts` — **fără potriviri** relevante la audit2026-04-11.
- **Reconciliere:** integrarea v2 cu PostgresSaver / `interrupt()` este **țintă arhitecturală**, nu runtime demonstrat în monorepo la acest audit.

## Aliniere la cercetare

Research-ul plasează tier-uri de autonomie și escaladare umană; cozile `human:*` / `hitl:*` din registry materializează **puncte de execuție**; **semantica unificată** este parțial reflectată în serviciul de `approval` din API.

## Reconciliere v2 ↔ cod

| Element v2 | Repo |
| --- | --- |
| LangGraph interrupt + resume | **Neconfirmat** în cod TypeScript. |
| SLA 2h/4h/8h/24h | **Politică v2** — câmpuri `dueAt` / priorități există în API approvals; **nu** s-a extras aici motorul complet de escaladare. |
| Listă neuroni HITL (e1…e5) | **Parțial** în registry + catalog (ex. N76–N78 E3, familii E4/E5) — detaliu în ADR-urile de familie. |

## Consecințe operaționale

1. Orice nou flux HITL trebuie să declare coada în registry și să se alinieze la `approvalService` sau să documenteze excepția.
2. Adoptarea LangGraph impune actualizare explicită a acestui ADR cu module și persistență checkpoint.

## Criterii de acceptanță (documentare)

- [ ] Hartă `hitl:*` / `human:*` → ecran API / workflow UI.
- [ ] Dovadă cod pentru escaladare automată SLA dacă devine obligatorie.

## Surse externe

- **LangGraph:** [https://langchain-ai.github.io/langgraph/](https://langchain-ai.github.io/langgraph/) — verificat la **2026-04-11** (context orchestrare; nu dovedește utilizarea în repo).

## Limită evidență

- Nu s-a auditat fiecare worker care consumă cozi `human:*` / `hitl:*` (handler-ii concreți).
- Convergența completă «toate etapele același motor» necesită revizuire `approvalTasks` vs cozi BullMQ — **în lucru documentar** în familii.

## Legături

- ADR-0001, ADR-0002, ADR-0004; familiile `human`/`hitl` din [README](../../README.md).
