# Cognitive Brain — documentație modulară

Acest director descompune conținutul din planul master într-o structură de contracte și ADR-uri editabile individual.

## Surse canonice

| Sursă | Rol |
| --- | --- |
| [`v2_cerniq_cognitive_brain_master_implementation_plan.md`](v2_cerniq_cognitive_brain_master_implementation_plan.md) | **Plan master canonic (v2):** dovezi branch/CMDB (§0), ADR-0001–0008, familii `ADR-FAMILY-e*`, registre neuron/sinapsă. Mod *evidence mode: conservative, non-inventive, branch-first*. |
| [`cerniq_cognitive_brain_master_implementation_plan.md`](cerniq_cognitive_brain_master_implementation_plan.md) | Versiune anterioară în același director; folosită doar dacă v2 nu acoperă un fragment și cu reconciliere explicită în ADR-uri. |
| [`cerniq_nuronal_research_base.md`](cerniq_nuronal_research_base.md) | Sinteză de cercetare (CoALA, orchestrare, ieșiri structurate, Neo4j, Kafka/BullMQ, guardrails, observabilitate). |

## Hartă directoare

| Cale | Conținut (corespondent în planul master) |
| --- | --- |
| [`research/`](research/) | Teme extrase din baza de cercetare neuronală (CoALA, SGLang, etc.). |
| [`overview/`](overview/) | §0–2, §8–9: dovezi, baseline factual, direcție arhitecturală, reconciliere runtime/graf, consecințe imediate. |
| [`adr/global/`](adr/global/) | ADR-0001 … ADR-0008 — fișiere **complete** (2026-04-11), ancorate în v2 §3, cu dovezi repo + surse externe datate unde e cazul. |
| [`adr/families/`](adr/families/) | 52 × ADR-FAMILY pe etapă (E1–E5). **E1–E5:** fișierele din [`adr/families/e1/`](adr/families/e1/) … [`e5/`](adr/families/e5/) sunt ADR-uri complete de documentare (2026-04-11), cu dovezi din [`queue-registry.ts`](../../workers/shared/src/queue-registry.ts) și [`cognitive-node-catalog.ts`](../../packages/shared/src/cognitive-node-catalog.ts), reconciliere față de **v2** și limite de evidență. |

## ADR-uri globale (0001–0008)

| ID | Titlu | Fișier |
| --- | --- | --- |
| ADR-0001 | Autoritate runtime neuron | [adr/global/ADR-0001-runtime-neuron-authority.md](adr/global/ADR-0001-runtime-neuron-authority.md) |
| ADR-0002 | Autoritate semantică neuron | [adr/global/ADR-0002-semantic-neuron-authority.md](adr/global/ADR-0002-semantic-neuron-authority.md) |
| ADR-0003 | Coloană vertebrală telemetrie | [adr/global/ADR-0003-telemetry-backbone.md](adr/global/ADR-0003-telemetry-backbone.md) |
| ADR-0004 | Direcție „event spine” | [adr/global/ADR-0004-event-spine-direction.md](adr/global/ADR-0004-event-spine-direction.md) |
| ADR-0005 | Direcție cogniție pe graf | [adr/global/ADR-0005-graph-cognition-direction.md](adr/global/ADR-0005-graph-cognition-direction.md) |
| ADR-0006 | Rutare modele self-hosted first | [adr/global/ADR-0006-self-hosted-model-routing.md](adr/global/ADR-0006-self-hosted-model-routing.md) |
| ADR-0007 | Guardrails ca infrastructură | [adr/global/ADR-0007-guardrails-infrastructure.md](adr/global/ADR-0007-guardrails-infrastructure.md) |
| ADR-0008 | HITL ca plan transversal | [adr/global/ADR-0008-hitl-transversal.md](adr/global/ADR-0008-hitl-transversal.md) |

### Matrice acoperire (v2 §3 · research · cod) — sumar

| ADR | v2 §3 | research_base | Cod (exemple) | Lacună declarată |
| --- | --- | --- | --- | --- |
| 0001 | Runtime = registry | BullMQ ca execuție | `queue-registry.ts` | Handler-i nu toți auditați |
| 0002 | Semantic = catalog | Taxonomii UI | `cognitive-node-catalog.ts`, `cognitive-brain.ts` | Drift OpenAPI «118» vs catalog |
| 0003 | OTel + GenAI semconv | Observabilitate | `observability/init.ts`, `withCognitiveSpan` | Fără `gen_ai.*` în TS la audit |
| 0004 | BullMQ + Kafka spine | Nerv dublu | BullMQ E4 FlowProducer | Fără client Kafka în repo |
| 0005 | Neo4j / GDS / GraphRAG | Graf / memorie | — | Fără Neo4j în TS la audit |
| 0006 | Self-hosted + SGLang | Modele / ieșiri | `llm-client.ts`, `outreach-llm-routing.ts` | SGLang / CMDB host nu în cod |
| 0007 | NeMo + Cedar | Guardrails | Catalog guard + `/guard` gateway | NeMo/Cedar npm lipsă |
| 0008 | HITL + LangGraph | Autonomie / HITL | Registry `hitl:*`, `enrichment.ts` approvals | LangGraph lipsă în TS |

### Checklist anti-halucinare (ADR globale)

Înainte de a considera un ADR global «închis», verificați: **(1)** fiecare afirmație despre cozi/API/OTel are fișier citit sau `grep` relevant; **(2)** faptele externe (versiuni, spec) au URL + dată (≥ aprilie 2026); **(3)** există paragraf **Limită evidență**; **(4)** distincție clară între **recomandare v2/research** și **implementat în repo**; **(5)** contradicții v2 vs cod tabelate, nu ignorate. Canon extins: [plan-task-execution.mdc](../../.cursor/rules/plan-task-execution.mdc), [anti-hallucination-global.mdc](../../.cursor/rules/anti-hallucination-global.mdc).

| [`governance/`](governance/) | Clase de sinapse și reguli tranzitorii (§5). |
| [`contracts/neurons/`](contracts/neurons/) | **322** fișiere contract (pereche unică etapă + coadă v2 §6) + schema [`_CONTRACT_SCHEMA.md`](contracts/neurons/_CONTRACT_SCHEMA.md); **324** intrări `### NEURON` în v2 (două cozi au câte două instanțe în același fișier: `ai:intent:classify`, `hitl:task:resolve`). |
| [`contracts/synapses/`](contracts/synapses/) | Un fișier placeholder per sinapsă din registrul §7. |

## Matrice neuron (v2 §6 × registry × catalog)

- [`NEURON_MATRIX.csv`](NEURON_MATRIX.csv) — câte un rând per antet `### NEURON` (324 rânduri).
- [`NEURON_MATRIX.md`](NEURON_MATRIX.md) — sumar + excerpt.
- Generator: `python3 docs/CognitiveBrain/scripts/build_neuron_matrix.py`

## Regenerare contracte neuron/sinapsă

Contracte neuron din v2 §6: generatorul creează **doar structura** (metadata, instanțe v2, extras) și **placeholder-e «TODO manual»** în coloana «În cod (dovadă)». Completarea raționată a fiecărui neuron = autor uman / agent care urmează DOD din [`contracts/neurons/CONTRACT_AUTHORING_CHECKLIST.md`](contracts/neurons/CONTRACT_AUTHORING_CHECKLIST.md). După închidere, adăugați `<!-- neuron-contract:author-complete -->` în fișier ca să nu fie suprascris la regenerare.

```bash
python3 docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py --force --prune-orphans
```

Placeholder-e simple (sinapse + neuroni fără self-aware) și regenerare opțională ADR-FAMILY:

```bash
python3 docs/CognitiveBrain/_generate_placeholders.py
```

`_generate_placeholders.py` citește **`v2_cerniq_cognitive_brain_master_implementation_plan.md`** dacă există; **nu** rescrie fișiere neuron care conțin deja `Tabel self-aware (13 criterii)` (folosiți `--force-neurons` pentru a forța). **ADR-FAMILY** nu sunt modificate decât cu `--refresh-family-placeholders` (evitați pe fișiere deja complete).

## Migrare registry / catalog (val 1)

Strategie cutover / dual-listen: [`migration/wave1-registry-catalog.md`](migration/wave1-registry-catalog.md).

## Sinteză pe etapă (ADR-uri de familie)

- **E2 — Outreach rece:** cozi `outreach:*`, `quota:*`, `email:*`, `wa:*`, `webhook:*`, `sequence:*`, `lead:*`, `ai:*`, `monitor:*`, `alert:*`, `human:*`, `pipeline:outreach:*`, `dlq:outreach`. Scop: orchestrare multi-canal, respectare cote, HITL pentru mesaje și takeover. Documentare în [`adr/families/e2/`](adr/families/e2/).
- **E3 — AI Sales:** product + hybrid search, nucleu agent (`ai:*` E3 distinct de E2), negociere, prețuri, stoc, Oblio/eFactura, documente, canale, MCP, guardrails deterministe, HITL E3. Scop: negociere B2B asistată cu guardrails și fiscalitate. Documentare în [`adr/families/e3/`](adr/families/e3/). *Reconciliere deschisă:* unele noduri din graf v2 (`ops`, `human` notificări) nu au încă cozi în `queue-registry.ts`; `e3:ai:response-generate` (catalog) vs `ai:e3:response:generate` (registry).
- **E4 — Post-vânzare:** Revolut, reconciliere plăți, credit scoring, Sameday, stoc Oblio E4, contracte DocuSign, retururi, alerte, audit hash-chain, HITL financiar. Scop: încasări, livrări, risc și conformitate după comandă. Documentare în [`adr/families/e4/`](adr/families/e4/).
- **E5 — Nurturing:** lifecycle FSM, churn, geo PostGIS, graf comunități, referral, winback, asociații agricole, feedback, content drip, alerte contextuale, compliance, HITL winback/plângeri. Scop: retenție și creștere după livrare. Documentare în [`adr/families/e5/`](adr/families/e5/).

## Matrice ADR-uri familie E2 (sumar)

| Familie (graf v2) | ADR | Sumar |
| --- | --- | --- |
| `ai-analysis` | [e2/ai-analysis.md](adr/families/e2/ai-analysis.md) | Sentiment + răspuns + intent; **gap** `ai:intent:classify` catalog vs registry (înlăturat din registry). |
| `email-cold` | [e2/email-cold.md](adr/families/e2/email-cold.md) | Campanii cold / `q:email:cold`; graf `add-to-campaign` fără literal în registry. |
| `email-warm` | [e2/email-warm.md](adr/families/e2/email-warm.md) | Warm Resend; `q:email:warm` vs `email:warm:send` în graf. |
| `human` | [e2/human.md](adr/families/e2/human.md) | HITL review/takeover/approve; ADR-0008 convergență. |
| `lead-fsm` | [e2/lead-fsm.md](adr/families/e2/lead-fsm.md) | Tranziții lead + validare + assign. |
| `monitoring` | [e2/monitoring.md](adr/families/e2/monitoring.md) | Health canale + alerte; `phone:quarantine:trigger` în registry. |
| `orchestrator` | [e2/orchestrator.md](adr/families/e2/orchestrator.md) | Dispatch/router/allocator/selector; graf `outreach:wa:delay` neconfirmat în `QUEUES`. |
| `quota` | [e2/quota.md](adr/families/e2/quota.md) | Guardian + business hours. |
| `sequences` | [e2/sequences.md](adr/families/e2/sequences.md) | 4 cozi runtime vs 1 nod în graf export. |
| `templates` | [e2/templates.md](adr/families/e2/templates.md) | Spintax/personalize/validate; graf 1 nod. |
| `webhooks` | [e2/webhooks.md](adr/families/e2/webhooks.md) | Ingestie + `webhook:normalize` (extra față de exemple graf). |
| `whatsapp` | [e2/whatsapp.md](adr/families/e2/whatsapp.md) | Per-telefon `q:wa:phone-XX` + legacy; registry `wa:delivery:status` fără `e2:` în catalog. |

## Matrice ADR-uri familie E3 (sumar)

| Familie | ADR | Sumar |
| --- | --- | --- |
| `ai-core` | [e3/ai-core.md](adr/families/e3/ai-core.md) | Agent E3; **nealiniere** catalog `ai:response:generate` vs registry `ai:e3:response:generate`. |
| `channels` | [e3/channels.md](adr/families/e3/channels.md) | Rutare canal; `channel:routing:decide` graf vs `channel:route:decide`. |
| `fiscal-docs` | [e3/fiscal-docs.md](adr/families/e3/fiscal-docs.md) | Oblio + eFactura + documente PDF/email/WA. |
| `guardrails` | [e3/guardrails.md](adr/families/e3/guardrails.md) | Preț/stoc/discount/SKU/fiscal; graf `stock:verify` / `log:analyze` vs catalog. |
| `human` | [e3/human.md](adr/families/e3/human.md) | `human:escalate/takeover/approve`; graf cu cozi diferite — gap. |
| `negotiation` | [e3/negotiation.md](adr/families/e3/negotiation.md) | FSM 8 cozi; `negotiation:summary:generate` în graf fără registry. |
| `ops` | [e3/ops.md](adr/families/e3/ops.md) | Graf `pipeline:ai-sales:*` **fără** potriviri în registry la audit. |
| `pricing` | [e3/pricing.md](adr/families/e3/pricing.md) | 6 cozi vs 3 exemple graf. |
| `product-search` | [e3/product-search.md](adr/families/e3/product-search.md) | Product + search hibrid; graf Shopify/stock sub `product:` — reconciliere. |
| `stock` | [e3/stock.md](adr/families/e3/stock.md) | Rezerve + sync ERP E3. |

## Matrice ADR-uri familie E4 (sumar)

| Familie | ADR | Sumar |
| --- | --- | --- |
| `alerts` | [e4/alerts.md](adr/families/e4/alerts.md) | `alert:*` vs `alert:client:*` în graf. |
| `audit` | [e4/audit.md](adr/families/e4/audit.md) | Hash-chain; `audit:compliance:check` graf vs `chain:verify` registry. |
| `cash` | [e4/cash.md](adr/families/e4/cash.md) | Revolut + reconciliere; unele etichete graf (`reconcile:daily:unmatched`) fără registry. |
| `contracts` | [e4/contracts.md](adr/families/e4/contracts.md) | DocuSign pipeline; denumiri graf extinse față de 5 cozi în registry. |
| `credit` | [e4/credit.md](adr/families/e4/credit.md) | Scoring + cron refresh/rezervări; noduri extra în graf. |
| `hitl` | [e4/hitl.md](adr/families/e4/hitl.md) | Aprobări financiare; noduri graf suplimentare. |
| `logistics` | [e4/logistics.md](adr/families/e4/logistics.md) | Sameday + stoc E4 + retururi; `return:*` denumiri diferite. |

## Matrice ADR-uri familie E5 (sumar)

| Familie | ADR | Sumar |
| --- | --- | --- |
| `alerts` | [e5/alerts.md](adr/families/e5/alerts.md) | `alerts:*` vreme/APIA vs `alert:internal:*` în graf. |
| `association-ingest` | [e5/association-ingest.md](adr/families/e5/association-ingest.md) | `association:*` runtime vs `bronze:ingest:pdf-extractor` în graf — gap. |
| `churn` | [e5/churn.md](adr/families/e5/churn.md) | Scoring + escaladare + sentiment/decay; prefixe diferite în graf. |
| `compliance` | [e5/compliance.md](adr/families/e5/compliance.md) | GDPR/concurență/retention; graf cu 4 etichete parțial mapate. |
| `content` | [e5/content.md](adr/families/e5/content.md) | Drip; graf amestecă cozi E2. |
| `feedback` | [e5/feedback.md](adr/families/e5/feedback.md) | NPS + plângeri + raport; noduri graf extra. |
| `geo` | [e5/geo.md](adr/families/e5/geo.md) | PostGIS proximity/teritorii; denumiri graf diferite. |
| `graph-community` | [e5/graph-community.md](adr/families/e5/graph-community.md) | Leiden/centralitate/KOL; graf `association:*` + `graph:build:full`. |
| `hitl` | [e5/hitl.md](adr/families/e5/hitl.md) | 2 cozi registry vs 6 noduri `hitl:task:*` în graf. |
| `lifecycle` | [e5/lifecycle.md](adr/families/e5/lifecycle.md) | FSM `lifecycle/onboarding/state` vs `nurturing:*` în graf. |
| `referral` | [e5/referral.md](adr/families/e5/referral.md) | Consimțământ GDPR + recompense; noduri extra în graf. |
| `winback` | [e5/winback.md](adr/families/e5/winback.md) | Campanii + `winback:escalate:hitl`; triggere subsidy/weather în graf. |

## Contracte neuron/sinapsă (legătură)

Matrice sumară E1 și încadrarea contractelor: [`contracts/README.md`](contracts/README.md).

## Checklist anti-halucinare (per ADR-FAMILY sau PR)

Înainte de a marca un item de documentare ca finalizat, verificați (aliniat [plan-task-execution.mdc](../../.cursor/rules/plan-task-execution.mdc) și [anti-hallucination-global.mdc](../../.cursor/rules/anti-hallucination-global.mdc)):

1. **Repo:** fiecare afirmație despre cozi are trimitere la `queue-registry.ts` și/sau `cognitive-node-catalog.ts` sau la fișierul worker citit.
2. **Extern:** versiuni/reguli furnizor doar cu sursă + dată (≥ context aprilie 2026).
3. **Zero presupuneri:** lipsă evidență = secțiune „Limită evidență”.
4. **Graf v2 vs runtime:** orice diferență de nume sau număr de neuroni este tabelată în ADR.
5. **Research vs implementat:** cercetarea și v2 §0.3 sunt **recomandări** până la dovada în cod.
6. **HITL:** pentru familii `human`/`hitl`, menționați ADR-0008 din v2 și cozile reale din registry.

Canon reguli: [documentation-and-research.mdc](../../.cursor/rules/documentation-and-research.mdc), [anti-hallucination-global.mdc](../../.cursor/rules/anti-hallucination-global.mdc), [plan-task-execution.mdc](../../.cursor/rules/plan-task-execution.mdc).

## Conformare documentație

Fișierele din `docs/CognitiveBrain/**` respectă [`.cursor/rules/documentation-and-research.mdc`](../../.cursor/rules/documentation-and-research.mdc) și [`.cursor/rules/anti-hallucination-global.mdc`](../../.cursor/rules/anti-hallucination-global.mdc) (dovezi, limite de evidență, fără presupuneri neexprimate).
