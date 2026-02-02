# Etapa 3 - Sprint Plan: AI Sales Agent Neuro-Simbolic

## Document Control

| Atribut | Valoare |
| --- | --- |
| **Versiune** | 1.0 |
| **Data** | 1 Februarie 2026 |
| **Status** | Draft |
| **Autor** | Cerniq Development Team |
| **Review** | Pending |

---

## Overview

### Scopul Documentului

Acest document definește planificarea detaliată pe sprint-uri pentru implementarea Etapei 3 - AI Sales Agent Neuro-Simbolic. Include:

- **12 Sprint-uri** de câte 1 săptămână (12 săptămâni total)
- **~48 Pull Requests** grupate per sprint
- **~214 Task-uri** cu mapare la fazele din `etapa3-plan-implementare.md`
- **Convenția de numerotare**: `E3.S{sprint}.PR{pr}.{task}`

### Timeline Total

| Dată Start | Dată End | Durată |
| --- | --- | --- |
| 3 Februarie 2026 | 24 Aprilie 2026 | 12 săptămâni |

### Echipa

| Rol | Persoană | Responsabilități |
| --- | --- | --- |
| Tech Lead | @lead-dev | Review PRs, Architecture decisions |
| Backend Dev | @backend-dev | Workers, API, DB |
| AI/ML Dev | @ai-dev | RAG, LLM integration, Guardrails |
| Frontend Dev | @frontend-dev | UI components, Dashboard |
| DevOps | @devops | Infrastructure, Monitoring |

---

## SUMAR SPRINT-URI

| Sprint | Perioada | Focus | PRs | Tasks | Story Points |
| --- | --- | --- | --- | --- | --- |
| **E3.S1** | 3-7 Feb | Foundation & Product Knowledge | 4 | 16 | 35 |
| **E3.S2** | 10-14 Feb | Hybrid Search RAG | 4 | 18 | 40 |
| **E3.S3** | 17-21 Feb | AI Core & Orchestration | 4 | 20 | 45 |
| **E3.S4** | 24-28 Feb | Negotiation FSM | 4 | 18 | 40 |
| **E3.S5** | 3-7 Mar | Pricing Engine | 4 | 16 | 35 |
| **E3.S6** | 10-14 Mar | Stock & Inventory | 4 | 18 | 40 |
| **E3.S7** | 17-21 Mar | Oblio Integration | 4 | 16 | 35 |
| **E3.S8** | 24-28 Mar | e-Factura SPV | 4 | 20 | 45 |
| **E3.S9** | 31 Mar - 4 Apr | Document Generation | 4 | 16 | 35 |
| **E3.S10** | 7-11 Apr | Handover & Channels | 4 | 18 | 40 |
| **E3.S11** | 14-18 Apr | Guardrails & HITL | 4 | 20 | 45 |
| **E3.S12** | 21-24 Apr | Frontend & Testing | 4 | 18 | 50 |
| **TOTAL** | - | - | **48** | **214** | **485** |

---

## Phase → Sprint Mapping

| Phase Range | Sprint | Descriere |
| --- | --- | --- |
| F3.1 - F3.2 | E3.S1 | Infrastructure setup, Product Knowledge Workers |
| F3.3 | E3.S2 | Hybrid Search RAG (Semantic, Keyword, Merge, Context) |
| F3.4 | E3.S3 | AI Core Orchestration (LLM, Tools, Response) |
| F3.5 | E3.S4 | Negotiation FSM (States, Transitions, History) |
| F3.6 | E3.S5 | Pricing Engine (Volume, Customer, Calculate) |
| F3.7 | E3.S6 | Stock & Inventory (Check, Reserve, Release) |
| F3.8 | E3.S7 | Oblio Integration (Invoice, Credit, Sync) |
| F3.9 | E3.S8 | e-Factura SPV (Generate, Validate, Submit, Poll) |
| F3.10 | E3.S9 | Document Generation (Proposal, Contract, Delivery) |
| F3.11 | E3.S10 | Handover & Channels (WhatsApp, Email, Web) |
| F3.12 - F3.13 | E3.S11 | Sentiment, Intent, MCP Server, Guardrails |
| F3.14 - F3.18 | E3.S12 | HITL, Frontend, Testing, Documentation |

---

## SPRINT 1: FOUNDATION & PRODUCT KNOWLEDGE (Săptămâna 1)

### 📅 Perioada: 3-7 Februarie 2026

### 🎯 Obiective Sprint

- [ ] Setup infrastructure pentru Etapa 3 workers
- [ ] Queue configuration pentru toate categoriile
- [ ] Product Knowledge Workers (Categoria A)
- [ ] Embedding generation pipeline

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 16 | - |
| Story Points | 35 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S1.PR1: Infrastructure Setup

**Branch:** `feature/e3-s1-pr1-infrastructure`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.1.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S1.PR1.001 | F3.1.1.T001 | Setup etapa3-queues.ts cu toate 78 queue-uri | ⬜ TODO | 4h |
| E3.S1.PR1.002 | F3.1.1.T002 | Configurare Redis pentru E3 workers | ⬜ TODO | 2h |
| E3.S1.PR1.003 | F3.1.1.T003 | Setup monitoring pentru E3 workers | ⬜ TODO | 3h |
| E3.S1.PR1.004 | F3.1.1.T004 | Base worker factory cu retry policies | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Toate 78 queue-uri definite în config
- [ ] Redis connection pooling configurat
- [ ] Prometheus metrics pentru workers
- [ ] Standardized worker factory funcțional

---

### PR E3.S1.PR2: Product Knowledge - Embeddings

**Branch:** `feature/e3-s1-pr2-pk-embeddings`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.2.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S1.PR2.001 | F3.2.1.T001 | Worker pk:embed pentru generare embeddings | ⬜ TODO | 4h |
| E3.S1.PR2.002 | F3.2.1.T002 | Batch processing pentru large catalogs | ⬜ TODO | 3h |
| E3.S1.PR2.003 | F3.2.1.T003 | Retry logic pentru OpenAI rate limits | ⬜ TODO | 2h |
| E3.S1.PR2.004 | F3.2.1.T004 | pgvector storage și indexare HNSW | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] Embeddings generate pentru toate produsele
- [ ] Batch size optimal (100 products/batch)
- [ ] HNSW index creat pentru search rapid
- [ ] Unit tests cu mock OpenAI

---

### PR E3.S1.PR3: Product Knowledge - Sync

**Branch:** `feature/e3-s1-pr3-pk-sync`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.2.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S1.PR3.001 | F3.2.2.T001 | Worker pk:sync pentru sincronizare catalog | ⬜ TODO | 3h |
| E3.S1.PR3.002 | F3.2.2.T002 | Change detection pentru incremental sync | ⬜ TODO | 3h |
| E3.S1.PR3.003 | F3.2.2.T003 | Scheduled job pentru daily full sync | ⬜ TODO | 2h |
| E3.S1.PR3.004 | F3.2.2.T004 | Metrics pentru sync success/failure | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Sync incremental pe bază de updated_at
- [ ] Full sync schedulat daily la 03:00
- [ ] Alert pe sync failures
- [ ] Integration tests cu test DB

---

### PR E3.S1.PR4: Product Knowledge - Summary Generation

**Branch:** `feature/e3-s1-pr4-pk-summary`  
**Reviewer:** @ai-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.2.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S1.PR4.001 | F3.2.3.T001 | Worker pk:summarize pentru AI summary | ⬜ TODO | 4h |
| E3.S1.PR4.002 | F3.2.3.T002 | Prompt template pentru product summaries | ⬜ TODO | 2h |
| E3.S1.PR4.003 | F3.2.3.T003 | Cache pentru summaries generate | ⬜ TODO | 2h |
| E3.S1.PR4.004 | F3.2.3.T004 | Tests și validation | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] AI summaries generate pentru fiecare produs
- [ ] Cache cu TTL 7 zile
- [ ] Romanian language quality
- [ ] Max 200 tokens per summary

---

## SPRINT 2: HYBRID SEARCH RAG (Săptămâna 2)

### 📅 Perioada: 10-14 Februarie 2026

### 🎯 Obiective Sprint

- [ ] Semantic search cu pgvector
- [ ] Keyword search cu FTS
- [ ] Hybrid merge cu RRF
- [ ] Context builder pentru LLM

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 18 | - |
| Story Points | 40 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S2.PR1: RAG Semantic Search

**Branch:** `feature/e3-s2-pr1-rag-semantic`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.3.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S2.PR1.001 | F3.3.1.T001 | Worker rag:semantic-search cu pgvector | ⬜ TODO | 4h |
| E3.S2.PR1.002 | F3.3.1.T002 | Cosine similarity cu operator <=> | ⬜ TODO | 2h |
| E3.S2.PR1.003 | F3.3.1.T003 | Dynamic filters pentru category, brand | ⬜ TODO | 3h |
| E3.S2.PR1.004 | F3.3.1.T004 | Redis caching pentru frequent queries | ⬜ TODO | 2h |
| E3.S2.PR1.005 | F3.3.1.T005 | Unit tests și benchmarks | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Vector search latency < 50ms pentru top 10
- [ ] Similarity threshold configurable
- [ ] Cache hit rate > 60%
- [ ] Integration tests funcționale

---

### PR E3.S2.PR2: RAG Keyword Search

**Branch:** `feature/e3-s2-pr2-rag-keyword`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.3.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S2.PR2.001 | F3.3.2.T001 | Worker rag:keyword-search cu PostgreSQL FTS | ⬜ TODO | 3h |
| E3.S2.PR2.002 | F3.3.2.T002 | ts_vector indexare cu romanian config | ⬜ TODO | 2h |
| E3.S2.PR2.003 | F3.3.2.T003 | Fuzzy matching cu prefix `:*` | ⬜ TODO | 2h |
| E3.S2.PR2.004 | F3.3.2.T004 | Weighted fields (name=A, desc=C) | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] FTS cu romanian dictionary
- [ ] ts_rank_cd pentru relevance scoring
- [ ] Prefix matching pentru autocomplete
- [ ] Tests cu Romanian text samples

---

### PR E3.S2.PR3: RAG Hybrid Merge

**Branch:** `feature/e3-s2-pr3-rag-hybrid`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.3.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S2.PR3.001 | F3.3.3.T001 | Worker rag:hybrid-merge cu RRF | ⬜ TODO | 4h |
| E3.S2.PR3.002 | F3.3.3.T002 | Reciprocal Rank Fusion (k=60) | ⬜ TODO | 3h |
| E3.S2.PR3.003 | F3.3.3.T003 | Dynamic weight adjustment by intent | ⬜ TODO | 3h |
| E3.S2.PR3.004 | F3.3.3.T004 | Parallel execution semantic + keyword | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] RRF merge corect implementat
- [ ] Weight adjustment pe baza intent-ului
- [ ] Latency < 100ms pentru hybrid search
- [ ] Overlap statistics pentru debugging

---

### PR E3.S2.PR4: RAG Context Builder

**Branch:** `feature/e3-s2-pr4-rag-context`  
**Reviewer:** @ai-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.3.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S2.PR4.001 | F3.3.4.T001 | Worker rag:context-build | ⬜ TODO | 4h |
| E3.S2.PR4.002 | F3.3.4.T002 | Token budgeting (max 4000 tokens) | ⬜ TODO | 2h |
| E3.S2.PR4.003 | F3.3.4.T003 | Product formatting pentru LLM | ⬜ TODO | 2h |
| E3.S2.PR4.004 | F3.3.4.T004 | Conversation history inclusion | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Context sub 4000 tokens
- [ ] Products prioritizate pe relevance
- [ ] Client profile inclus când disponibil
- [ ] Token count metrics

---

## SPRINT 3: AI CORE & ORCHESTRATION (Săptămâna 3)

### 📅 Perioada: 17-21 Februarie 2026

### 🎯 Obiective Sprint

- [ ] AI Orchestration Worker principal
- [ ] LLM Integration (xAI Grok-4, OpenAI GPT-4o)
- [ ] Tool execution pipeline
- [ ] Response generation

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 20 | - |
| Story Points | 45 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S3.PR1: AI Orchestration Core

**Branch:** `feature/e3-s3-pr1-ai-orchestrate`  
**Reviewer:** @ai-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F3.4.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S3.PR1.001 | F3.4.1.T001 | Worker ai:orchestrate - main orchestrator | ⬜ TODO | 6h |
| E3.S3.PR1.002 | F3.4.1.T002 | Message processing pipeline | ⬜ TODO | 4h |
| E3.S3.PR1.003 | F3.4.1.T003 | State machine integration | ⬜ TODO | 4h |
| E3.S3.PR1.004 | F3.4.1.T004 | Guardrails orchestration | ⬜ TODO | 4h |
| E3.S3.PR1.005 | F3.4.1.T005 | Error handling și HITL fallback | ⬜ TODO | 3h |

#### Acceptance Criteria

- [ ] End-to-end message processing funcțional
- [ ] FSM transitions trigger correctly
- [ ] Guardrails executed înainte de response
- [ ] HITL escalation pe errors

---

### PR E3.S3.PR2: LLM Integration

**Branch:** `feature/e3-s3-pr2-llm-integration`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.4.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S3.PR2.001 | F3.4.2.T001 | xAI Grok-4 client setup | ⬜ TODO | 3h |
| E3.S3.PR2.002 | F3.4.2.T002 | OpenAI GPT-4o fallback | ⬜ TODO | 2h |
| E3.S3.PR2.003 | F3.4.2.T003 | Provider switching logic | ⬜ TODO | 2h |
| E3.S3.PR2.004 | F3.4.2.T004 | Rate limiting și quota tracking | ⬜ TODO | 2h |
| E3.S3.PR2.005 | F3.4.2.T005 | Token usage metrics | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] xAI Grok-4 primary provider
- [ ] Automatic fallback la GPT-4o
- [ ] Rate limits respected
- [ ] Token usage tracked per tenant

---

### PR E3.S3.PR3: Tool Execution Pipeline

**Branch:** `feature/e3-s3-pr3-tool-execution`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.4.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S3.PR3.001 | F3.4.3.T001 | Tool registry și definitions | ⬜ TODO | 3h |
| E3.S3.PR3.002 | F3.4.3.T002 | Tool executor cu validation | ⬜ TODO | 4h |
| E3.S3.PR3.003 | F3.4.3.T003 | Parallel tool execution | ⬜ TODO | 3h |
| E3.S3.PR3.004 | F3.4.3.T004 | Tool result formatting | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Tools definite cu JSON Schema
- [ ] Validation pe input/output
- [ ] Parallel execution când posibil
- [ ] Error handling per tool

---

### PR E3.S3.PR4: Response Generation

**Branch:** `feature/e3-s3-pr4-response-gen`  
**Reviewer:** @ai-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.4.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S3.PR4.001 | F3.4.4.T001 | Worker ai:response pentru generare răspuns | ⬜ TODO | 4h |
| E3.S3.PR4.002 | F3.4.4.T002 | System prompt templates | ⬜ TODO | 2h |
| E3.S3.PR4.003 | F3.4.4.T003 | Romanian language validation | ⬜ TODO | 2h |
| E3.S3.PR4.004 | F3.4.4.T004 | Response formatting per channel | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Responses în română corectă
- [ ] Channel-specific formatting
- [ ] Max token limits respected
- [ ] Professional tone enforcement

---

## SPRINT 4: NEGOTIATION FSM (Săptămâna 4)

### 📅 Perioada: 24-28 Februarie 2026

### 🎯 Obiective Sprint

- [ ] State machine complet pentru negocieri
- [ ] State transitions cu validare
- [ ] History tracking pentru audit
- [ ] FSM Workers (Categoria D)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 18 | - |
| Story Points | 40 | - |
| Test Coverage | ≥85% | - |

---

### PR E3.S4.PR1: FSM State Definitions

**Branch:** `feature/e3-s4-pr1-fsm-states`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.5.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S4.PR1.001 | F3.5.1.T001 | Definire toate stările negociere | ⬜ TODO | 3h |
| E3.S4.PR1.002 | F3.5.1.T002 | Transition matrix validare | ⬜ TODO | 3h |
| E3.S4.PR1.003 | F3.5.1.T003 | State metadata și constraints | ⬜ TODO | 2h |
| E3.S4.PR1.004 | F3.5.1.T004 | State diagram documentation | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Toate 15 stări definite
- [ ] Transitions validate pe matrix
- [ ] Constraints per state
- [ ] Documentation cu diagrame

---

### PR E3.S4.PR2: FSM Transition Worker

**Branch:** `feature/e3-s4-pr2-fsm-transition`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.5.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S4.PR2.001 | F3.5.2.T001 | Worker neg:transition pentru schimbări stare | ⬜ TODO | 4h |
| E3.S4.PR2.002 | F3.5.2.T002 | Pre-transition hooks | ⬜ TODO | 3h |
| E3.S4.PR2.003 | F3.5.2.T003 | Post-transition actions | ⬜ TODO | 3h |
| E3.S4.PR2.004 | F3.5.2.T004 | Transition validation strict | ⬜ TODO | 2h |
| E3.S4.PR2.005 | F3.5.2.T005 | Event emission pe transition | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Transitions validate contra matrix
- [ ] Pre/post hooks funcționale
- [ ] Events emitted pentru observability
- [ ] Rollback pe failed transitions

---

### PR E3.S4.PR3: FSM History Tracking

**Branch:** `feature/e3-s4-pr3-fsm-history`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.5.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S4.PR3.001 | F3.5.3.T001 | Worker neg:history pentru audit trail | ⬜ TODO | 3h |
| E3.S4.PR3.002 | F3.5.3.T002 | State snapshots pe fiecare transition | ⬜ TODO | 3h |
| E3.S4.PR3.003 | F3.5.3.T003 | Timeline reconstruction API | ⬜ TODO | 2h |
| E3.S4.PR3.004 | F3.5.3.T004 | Metrics pentru state durations | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Audit trail complet
- [ ] Snapshots pentru recovery
- [ ] Timeline queryable
- [ ] Duration metrics per state

---

### PR E3.S4.PR4: FSM Intent Handlers

**Branch:** `feature/e3-s4-pr4-fsm-intent`  
**Reviewer:** @ai-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.5.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S4.PR4.001 | F3.5.4.T001 | Intent to transition mapping | ⬜ TODO | 3h |
| E3.S4.PR4.002 | F3.5.4.T002 | Auto-transition pe certain intents | ⬜ TODO | 2h |
| E3.S4.PR4.003 | F3.5.4.T003 | Manual override handling | ⬜ TODO | 2h |
| E3.S4.PR4.004 | F3.5.4.T004 | Tests pentru intent->state flows | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Intent mapping corect
- [ ] Auto-transitions funcționale
- [ ] Manual override pentru edge cases
- [ ] E2E tests pentru flows

---

## SPRINT 5: PRICING ENGINE (Săptămâna 5)

### 📅 Perioada: 3-7 Martie 2026

### 🎯 Obiective Sprint

- [ ] Volume discount calculation
- [ ] Customer-specific pricing
- [ ] Price calculation cu guardrails
- [ ] Pricing Workers (Categoria E)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 16 | - |
| Story Points | 35 | - |
| Test Coverage | ≥90% | - |

---

### PR E3.S5.PR1: Volume Discount Worker

**Branch:** `feature/e3-s5-pr1-volume-discount`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.6.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S5.PR1.001 | F3.6.1.T001 | Worker price:volume-discount | ⬜ TODO | 4h |
| E3.S5.PR1.002 | F3.6.1.T002 | Tiered discount calculation | ⬜ TODO | 3h |
| E3.S5.PR1.003 | F3.6.1.T003 | Product category rules | ⬜ TODO | 2h |
| E3.S5.PR1.004 | F3.6.1.T004 | Decimal.js pentru precizie financiară | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Volume tiers calculate corect
- [ ] Category-specific rules
- [ ] No floating point errors
- [ ] Audit trail pentru discounts

---

### PR E3.S5.PR2: Customer Discount Worker

**Branch:** `feature/e3-s5-pr2-customer-discount`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.6.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S5.PR2.001 | F3.6.2.T001 | Worker price:customer-discount | ⬜ TODO | 3h |
| E3.S5.PR2.002 | F3.6.2.T002 | Customer tier lookup | ⬜ TODO | 2h |
| E3.S5.PR2.003 | F3.6.2.T003 | Special agreements handling | ⬜ TODO | 2h |
| E3.S5.PR2.004 | F3.6.2.T004 | Discount stacking rules | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Customer-specific discounts loaded
- [ ] Tier-based base discounts
- [ ] Special agreements override
- [ ] Max discount cap enforcement

---

### PR E3.S5.PR3: Price Calculator Worker

**Branch:** `feature/e3-s5-pr3-price-calculate`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.6.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S5.PR3.001 | F3.6.3.T001 | Worker price:calculate cu all discounts | ⬜ TODO | 4h |
| E3.S5.PR3.002 | F3.6.3.T002 | Min price guardrail | ⬜ TODO | 2h |
| E3.S5.PR3.003 | F3.6.3.T003 | Min margin guardrail (5%) | ⬜ TODO | 2h |
| E3.S5.PR3.004 | F3.6.3.T004 | VAT calculation | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] All discounts applied corect
- [ ] Guardrails pentru min price
- [ ] Margin never below 5%
- [ ] VAT accurate

---

### PR E3.S5.PR4: Price History Worker

**Branch:** `feature/e3-s5-pr4-price-history`  
**Reviewer:** @backend-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F3.6.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S5.PR4.001 | F3.6.4.T001 | Worker price:history pentru tracking | ⬜ TODO | 3h |
| E3.S5.PR4.002 | F3.6.4.T002 | Price change events | ⬜ TODO | 2h |
| E3.S5.PR4.003 | F3.6.4.T003 | Historical price lookup | ⬜ TODO | 2h |
| E3.S5.PR4.004 | F3.6.4.T004 | Price analytics queries | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] All price changes logged
- [ ] Historical lookup funcțional
- [ ] Analytics pentru price trends
- [ ] Retention policy respectată

---

## SPRINT 6: STOCK & INVENTORY (Săptămâna 6)

### 📅 Perioada: 10-14 Martie 2026

### 🎯 Obiective Sprint

- [ ] Stock check cu rezervări
- [ ] Stock reservation system
- [ ] Stock release și expiry
- [ ] Stock Workers (Categoria F)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 18 | - |
| Story Points | 40 | - |
| Test Coverage | ≥85% | - |

---

### PR E3.S6.PR1: Stock Check Worker

**Branch:** `feature/e3-s6-pr1-stock-check`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.7.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S6.PR1.001 | F3.7.1.T001 | Worker stock:check pentru disponibilitate | ⬜ TODO | 4h |
| E3.S6.PR1.002 | F3.7.1.T002 | Reserved stock consideration | ⬜ TODO | 3h |
| E3.S6.PR1.003 | F3.7.1.T003 | Low stock alerts | ⬜ TODO | 2h |
| E3.S6.PR1.004 | F3.7.1.T004 | Alternative product suggestions | ⬜ TODO | 2h |
| E3.S6.PR1.005 | F3.7.1.T005 | Short cache (30s) pentru stock data | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Available = Current - Reserved
- [ ] Low stock alerts triggered
- [ ] Alternatives suggested
- [ ] Short cache pentru accuracy

---

### PR E3.S6.PR2: Stock Reserve Worker

**Branch:** `feature/e3-s6-pr2-stock-reserve`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.7.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S6.PR2.001 | F3.7.2.T001 | Worker stock:reserve cu distributed lock | ⬜ TODO | 4h |
| E3.S6.PR2.002 | F3.7.2.T002 | Row-level locking cu FOR UPDATE | ⬜ TODO | 3h |
| E3.S6.PR2.003 | F3.7.2.T003 | Reservation expiry scheduling | ⬜ TODO | 2h |
| E3.S6.PR2.004 | F3.7.2.T004 | Extend existing reservations | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] No race conditions
- [ ] Reservations auto-expire
- [ ] Extension capability
- [ ] Audit trail pentru reservations

---

### PR E3.S6.PR3: Stock Release Worker

**Branch:** `feature/e3-s6-pr3-stock-release`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.7.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S6.PR3.001 | F3.7.3.T001 | Worker stock:release pentru eliberare | ⬜ TODO | 3h |
| E3.S6.PR3.002 | F3.7.3.T002 | Multiple release types | ⬜ TODO | 2h |
| E3.S6.PR3.003 | F3.7.3.T003 | Stock movements logging | ⬜ TODO | 2h |
| E3.S6.PR3.004 | F3.7.3.T004 | Batch release for expired | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Release by negotiation/ids/expired
- [ ] Stock movements logged
- [ ] Batch processing efficient
- [ ] Transaction safety

---

### PR E3.S6.PR4: Stock Alert Worker

**Branch:** `feature/e3-s6-pr4-stock-alert`  
**Reviewer:** @backend-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F3.7.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S6.PR4.001 | F3.7.4.T001 | Worker stock:alert pentru notifications | ⬜ TODO | 3h |
| E3.S6.PR4.002 | F3.7.4.T002 | Threshold configuration per product | ⬜ TODO | 2h |
| E3.S6.PR4.003 | F3.7.4.T003 | Alert deduplication | ⬜ TODO | 2h |
| E3.S6.PR4.004 | F3.7.4.T004 | Multi-channel notifications | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Configurable thresholds
- [ ] No duplicate alerts
- [ ] Email + Slack notifications
- [ ] Priority levels

---

## SPRINT 7: OBLIO INTEGRATION (Săptămâna 7)

### 📅 Perioada: 17-21 Martie 2026

### 🎯 Obiective Sprint

- [ ] Oblio API client
- [ ] Invoice generation
- [ ] Credit note generation
- [ ] Oblio Workers (Categoria G)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 16 | - |
| Story Points | 35 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S7.PR1: Oblio Client Setup

**Branch:** `feature/e3-s7-pr1-oblio-client`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.8.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S7.PR1.001 | F3.8.1.T001 | Oblio API client cu OAuth2 | ⬜ TODO | 4h |
| E3.S7.PR1.002 | F3.8.1.T002 | Token refresh mechanism | ⬜ TODO | 2h |
| E3.S7.PR1.003 | F3.8.1.T003 | Rate limiting (100 req/min) | ⬜ TODO | 2h |
| E3.S7.PR1.004 | F3.8.1.T004 | Error handling și retries | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] OAuth2 authentication funcțională
- [ ] Token auto-refresh
- [ ] Rate limits respected
- [ ] Comprehensive error handling

---

### PR E3.S7.PR2: Oblio Invoice Worker

**Branch:** `feature/e3-s7-pr2-oblio-invoice`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.8.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S7.PR2.001 | F3.8.2.T001 | Worker oblio:invoice pentru generare | ⬜ TODO | 4h |
| E3.S7.PR2.002 | F3.8.2.T002 | Fiscal data validation | ⬜ TODO | 2h |
| E3.S7.PR2.003 | F3.8.2.T003 | Invoice sync to local DB | ⬜ TODO | 2h |
| E3.S7.PR2.004 | F3.8.2.T004 | Auto e-Factura queue pentru > 5000 RON | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Invoice created în Oblio
- [ ] Local DB synchronized
- [ ] e-Factura auto-queued
- [ ] HITL escalation pe failure

---

### PR E3.S7.PR3: Oblio Credit Note Worker

**Branch:** `feature/e3-s7-pr3-oblio-credit`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.8.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S7.PR3.001 | F3.8.3.T001 | Worker oblio:credit pentru storno | ⬜ TODO | 3h |
| E3.S7.PR3.002 | F3.8.3.T002 | Partial și full refund support | ⬜ TODO | 2h |
| E3.S7.PR3.003 | F3.8.3.T003 | Original invoice linking | ⬜ TODO | 2h |
| E3.S7.PR3.004 | F3.8.3.T004 | e-Factura storno handling | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Credit notes linked to original
- [ ] Partial refunds supported
- [ ] e-Factura storno corect
- [ ] Sync to local DB

---

### PR E3.S7.PR4: Oblio Sync Worker

**Branch:** `feature/e3-s7-pr4-oblio-sync`  
**Reviewer:** @backend-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F3.8.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S7.PR4.001 | F3.8.4.T001 | Worker oblio:sync pentru reconciliere | ⬜ TODO | 3h |
| E3.S7.PR4.002 | F3.8.4.T002 | Status updates from Oblio | ⬜ TODO | 2h |
| E3.S7.PR4.003 | F3.8.4.T003 | Discrepancy detection | ⬜ TODO | 2h |
| E3.S7.PR4.004 | F3.8.4.T004 | Scheduled daily sync | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Daily sync scheduled
- [ ] Status updates reflected
- [ ] Discrepancies flagged
- [ ] Alerts pentru issues

---

## SPRINT 8: E-FACTURA SPV (Săptămâna 8)

### 📅 Perioada: 24-28 Martie 2026

### 🎯 Obiective Sprint

- [ ] e-Factura XML generation (UBL 2.1)
- [ ] ANAF SPV submission
- [ ] Polling și status tracking
- [ ] e-Factura Workers (Categoria H)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 20 | - |
| Story Points | 45 | - |
| Test Coverage | ≥85% | - |

---

### PR E3.S8.PR1: e-Factura XML Generation

**Branch:** `feature/e3-s8-pr1-efactura-generate`  
**Reviewer:** @backend-dev  
**Estimare:** 3 zile  
**Phase Mapping:** F3.9.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S8.PR1.001 | F3.9.1.T001 | Worker efactura:generate UBL 2.1 | ⬜ TODO | 6h |
| E3.S8.PR1.002 | F3.9.1.T002 | CIUS-RO compliance | ⬜ TODO | 4h |
| E3.S8.PR1.003 | F3.9.1.T003 | XML validation pre-submit | ⬜ TODO | 3h |
| E3.S8.PR1.004 | F3.9.1.T004 | SHA256 hash calculation | ⬜ TODO | 2h |
| E3.S8.PR1.005 | F3.9.1.T005 | Unit code mapping (UN/ECE Rec 20) | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] UBL 2.1 compliant XML
- [ ] CIUS-RO validations pass
- [ ] Hash pentru integrity
- [ ] Correct unit codes

---

### PR E3.S8.PR2: e-Factura Validation

**Branch:** `feature/e3-s8-pr2-efactura-validate`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.9.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S8.PR2.001 | F3.9.2.T001 | Worker efactura:validate | ⬜ TODO | 3h |
| E3.S8.PR2.002 | F3.9.2.T002 | Schema validation | ⬜ TODO | 2h |
| E3.S8.PR2.003 | F3.9.2.T003 | Business rules validation | ⬜ TODO | 2h |
| E3.S8.PR2.004 | F3.9.2.T004 | CUI validation (checksum) | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] XSD validation pass
- [ ] Business rules checked
- [ ] CUI checksum verified
- [ ] Clear error messages

---

### PR E3.S8.PR3: e-Factura Submit

**Branch:** `feature/e3-s8-pr3-efactura-submit`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.9.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S8.PR3.001 | F3.9.3.T001 | Worker efactura:submit la ANAF | ⬜ TODO | 4h |
| E3.S8.PR3.002 | F3.9.3.T002 | OAuth2 ANAF token management | ⬜ TODO | 3h |
| E3.S8.PR3.003 | F3.9.3.T003 | Upload index extraction | ⬜ TODO | 2h |
| E3.S8.PR3.004 | F3.9.3.T004 | Poll job scheduling | ⬜ TODO | 2h |
| E3.S8.PR3.005 | F3.9.3.T005 | HITL escalation după 3 retries | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] ANAF API integration
- [ ] Token refresh funcțional
- [ ] Polling scheduled
- [ ] HITL on failures

---

### PR E3.S8.PR4: e-Factura Poll & Download

**Branch:** `feature/e3-s8-pr4-efactura-poll`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.9.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S8.PR4.001 | F3.9.4.T001 | Worker efactura:poll cu exponential backoff | ⬜ TODO | 4h |
| E3.S8.PR4.002 | F3.9.4.T002 | Status handling (ok, nok, in_prelucrare) | ⬜ TODO | 3h |
| E3.S8.PR4.003 | F3.9.4.T003 | Worker efactura:download | ⬜ TODO | 2h |
| E3.S8.PR4.004 | F3.9.4.T004 | Max poll attempts (20) cu HITL | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Exponential backoff
- [ ] All ANAF statuses handled
- [ ] Download pe accepted
- [ ] HITL pe rejected/timeout

---

## SPRINT 9: DOCUMENT GENERATION (Săptămâna 9)

### 📅 Perioada: 31 Martie - 4 Aprilie 2026

### 🎯 Obiective Sprint

- [ ] Proposal PDF generation
- [ ] Contract generation
- [ ] Delivery note generation
- [ ] Document Workers (Categoria I)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 16 | - |
| Story Points | 35 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S9.PR1: Proposal Generator

**Branch:** `feature/e3-s9-pr1-doc-proposal`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.10.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S9.PR1.001 | F3.10.1.T001 | Worker doc:proposal cu PDFKit | ⬜ TODO | 4h |
| E3.S9.PR1.002 | F3.10.1.T002 | Professional PDF layout | ⬜ TODO | 3h |
| E3.S9.PR1.003 | F3.10.1.T003 | S3 upload și storage | ⬜ TODO | 2h |
| E3.S9.PR1.004 | F3.10.1.T004 | Document record în DB | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] PDF profesional generat
- [ ] Logo și branding
- [ ] S3 storage
- [ ] Document tracking

---

### PR E3.S9.PR2: Contract Generator

**Branch:** `feature/e3-s9-pr2-doc-contract`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.10.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S9.PR2.001 | F3.10.2.T001 | Worker doc:contract | ⬜ TODO | 4h |
| E3.S9.PR2.002 | F3.10.2.T002 | Template engine (Handlebars) | ⬜ TODO | 3h |
| E3.S9.PR2.003 | F3.10.2.T003 | Legal clauses injection | ⬜ TODO | 2h |
| E3.S9.PR2.004 | F3.10.2.T004 | Multiple format support (PDF, DOCX) | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Contract template engine
- [ ] Legal clauses incluse
- [ ] PDF și DOCX output
- [ ] Versioning support

---

### PR E3.S9.PR3: Delivery Note Generator

**Branch:** `feature/e3-s9-pr3-doc-delivery`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.10.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S9.PR3.001 | F3.10.3.T001 | Worker doc:delivery-note | ⬜ TODO | 3h |
| E3.S9.PR3.002 | F3.10.3.T002 | Product list formatting | ⬜ TODO | 2h |
| E3.S9.PR3.003 | F3.10.3.T003 | Signature fields | ⬜ TODO | 2h |
| E3.S9.PR3.004 | F3.10.3.T004 | Print-ready layout | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Delivery note complet
- [ ] Print-ready format
- [ ] Signature placeholders
- [ ] Sequential numbering

---

### PR E3.S9.PR4: Document Management

**Branch:** `feature/e3-s9-pr4-doc-management`  
**Reviewer:** @backend-dev  
**Estimare:** 1 zi  
**Phase Mapping:** F3.10.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S9.PR4.001 | F3.10.4.T001 | Document versioning system | ⬜ TODO | 3h |
| E3.S9.PR4.002 | F3.10.4.T002 | Expiry tracking | ⬜ TODO | 2h |
| E3.S9.PR4.003 | F3.10.4.T003 | Signed URL generation | ⬜ TODO | 2h |
| E3.S9.PR4.004 | F3.10.4.T004 | Document search și listing | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Version control pentru docs
- [ ] Expiry alerts
- [ ] Secure access via signed URLs
- [ ] Search functionality

---

## SPRINT 10: HANDOVER & CHANNELS (Săptămâna 10)

### 📅 Perioada: 7-11 Aprilie 2026

### 🎯 Obiective Sprint

- [ ] Channel orchestration
- [ ] WhatsApp delivery
- [ ] Email delivery
- [ ] Channel Workers (Categoria J)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 18 | - |
| Story Points | 40 | - |
| Test Coverage | ≥80% | - |

---

### PR E3.S10.PR1: Channel Orchestrator

**Branch:** `feature/e3-s10-pr1-channel-orchestrate`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.11.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S10.PR1.001 | F3.11.1.T001 | Worker channel:orchestrate | ⬜ TODO | 4h |
| E3.S10.PR1.002 | F3.11.1.T002 | Session management | ⬜ TODO | 3h |
| E3.S10.PR1.003 | F3.11.1.T003 | Inbound routing la AI | ⬜ TODO | 2h |
| E3.S10.PR1.004 | F3.11.1.T004 | Outbound routing per channel | ⬜ TODO | 2h |
| E3.S10.PR1.005 | F3.11.1.T005 | Contact creation pentru noi | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Multi-channel routing
- [ ] Session persistence
- [ ] AI orchestration trigger
- [ ] New contact handling

---

### PR E3.S10.PR2: WhatsApp Delivery

**Branch:** `feature/e3-s10-pr2-channel-whatsapp`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.11.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S10.PR2.001 | F3.11.2.T001 | Worker channel:whatsapp delivery | ⬜ TODO | 4h |
| E3.S10.PR2.002 | F3.11.2.T002 | TimelinesAI integration | ⬜ TODO | 3h |
| E3.S10.PR2.003 | F3.11.2.T003 | Message templates support | ⬜ TODO | 2h |
| E3.S10.PR2.004 | F3.11.2.T004 | Media attachments | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] WhatsApp delivery funcțional
- [ ] Templates pentru approved messages
- [ ] Media support (images, docs)
- [ ] Delivery status tracking

---

### PR E3.S10.PR3: Email Delivery

**Branch:** `feature/e3-s10-pr3-channel-email`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.11.3

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S10.PR3.001 | F3.11.3.T001 | Worker channel:email delivery | ⬜ TODO | 3h |
| E3.S10.PR3.002 | F3.11.3.T002 | Resend integration | ⬜ TODO | 2h |
| E3.S10.PR3.003 | F3.11.3.T003 | HTML email templates | ⬜ TODO | 2h |
| E3.S10.PR3.004 | F3.11.3.T004 | Attachment handling | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Email delivery via Resend
- [ ] HTML templates profesionale
- [ ] Attachments support
- [ ] Bounce handling

---

### PR E3.S10.PR4: Webhook Handlers

**Branch:** `feature/e3-s10-pr4-channel-webhooks`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.11.4

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S10.PR4.001 | F3.11.4.T001 | WhatsApp webhook handler | ⬜ TODO | 3h |
| E3.S10.PR4.002 | F3.11.4.T002 | Email webhook handler (Svix) | ⬜ TODO | 2h |
| E3.S10.PR4.003 | F3.11.4.T003 | Signature verification | ⬜ TODO | 2h |
| E3.S10.PR4.004 | F3.11.4.T004 | Event normalization | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Webhook signatures verified
- [ ] Events normalized
- [ ] Idempotency handling
- [ ] Logging pentru debug

---

## SPRINT 11: GUARDRAILS & HITL (Săptămâna 11)

### 📅 Perioada: 14-18 Aprilie 2026

### 🎯 Obiective Sprint

- [ ] Price guardrail
- [ ] Stock guardrail
- [ ] HITL escalation system
- [ ] Guardrails & HITL Workers (Categoria M, N)

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 20 | - |
| Story Points | 45 | - |
| Test Coverage | ≥90% | - |

---

### PR E3.S11.PR1: Price Guardrail

**Branch:** `feature/e3-s11-pr1-guard-price`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.14.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S11.PR1.001 | F3.14.1.T001 | Worker guard:price pentru validare | ⬜ TODO | 4h |
| E3.S11.PR1.002 | F3.14.1.T002 | Price extraction din response | ⬜ TODO | 3h |
| E3.S11.PR1.003 | F3.14.1.T003 | Variance calculation | ⬜ TODO | 2h |
| E3.S11.PR1.004 | F3.14.1.T004 | Correction prompt generation | ⬜ TODO | 2h |
| E3.S11.PR1.005 | F3.14.1.T005 | Suspicious pattern detection | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] All prices verified contra tools
- [ ] Variance > 1% flagged
- [ ] Correction prompts clear
- [ ] Metrics pentru pass/fail

---

### PR E3.S11.PR2: Stock Guardrail

**Branch:** `feature/e3-s11-pr2-guard-stock`  
**Reviewer:** @ai-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.14.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S11.PR2.001 | F3.14.2.T001 | Worker guard:stock pentru validare | ⬜ TODO | 4h |
| E3.S11.PR2.002 | F3.14.2.T002 | Availability claims extraction | ⬜ TODO | 3h |
| E3.S11.PR2.003 | F3.14.2.T003 | Tool verification check | ⬜ TODO | 2h |
| E3.S11.PR2.004 | F3.14.2.T004 | Unconditional promise detection | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] No unverified stock claims
- [ ] Quantity validated
- [ ] Dangerous patterns flagged
- [ ] HITL trigger pe violations

---

### PR E3.S11.PR3: HITL Escalation System

**Branch:** `feature/e3-s11-pr3-hitl-escalate`  
**Reviewer:** @backend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.15.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S11.PR3.001 | F3.15.1.T001 | Worker hitl:escalate | ⬜ TODO | 4h |
| E3.S11.PR3.002 | F3.15.1.T002 | Priority queue management | ⬜ TODO | 3h |
| E3.S11.PR3.003 | F3.15.1.T003 | SLA tracking | ⬜ TODO | 2h |
| E3.S11.PR3.004 | F3.15.1.T004 | Assignment routing | ⬜ TODO | 2h |
| E3.S11.PR3.005 | F3.15.1.T005 | Notifications to agents | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Priority-based queue
- [ ] SLA monitoring
- [ ] Agent assignment
- [ ] Real-time notifications

---

### PR E3.S11.PR4: HITL Resolution

**Branch:** `feature/e3-s11-pr4-hitl-resolve`  
**Reviewer:** @backend-dev  
**Estimare:** 1.5 zile  
**Phase Mapping:** F3.15.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S11.PR4.001 | F3.15.2.T001 | Worker hitl:resolve | ⬜ TODO | 3h |
| E3.S11.PR4.002 | F3.15.2.T002 | AI handback mechanism | ⬜ TODO | 2h |
| E3.S11.PR4.003 | F3.15.2.T003 | Resolution tracking | ⬜ TODO | 2h |
| E3.S11.PR4.004 | F3.15.2.T004 | Feedback loop pentru AI improvement | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Clean handback to AI
- [ ] Resolution logged
- [ ] Feedback captured
- [ ] Metrics pentru resolution time

---

## SPRINT 12: FRONTEND & TESTING (Săptămâna 12)

### 📅 Perioada: 21-24 Aprilie 2026

### 🎯 Obiective Sprint

- [ ] AI Dashboard components
- [ ] HITL Review Queue UI
- [ ] E2E Testing
- [ ] Documentation finalization

### 📊 Metrici Sprint

| Metrică | Target | Actual |
| --- | --- | --- |
| PR-uri planificate | 4 | - |
| Task-uri planificate | 18 | - |
| Story Points | 50 | - |
| Test Coverage | ≥85% | - |

---

### PR E3.S12.PR1: AI Dashboard

**Branch:** `feature/e3-s12-pr1-ai-dashboard`  
**Reviewer:** @frontend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.16.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S12.PR1.001 | F3.16.1.T001 | AI Agent Dashboard page | ⬜ TODO | 4h |
| E3.S12.PR1.002 | F3.16.1.T002 | Active negotiations widget | ⬜ TODO | 3h |
| E3.S12.PR1.003 | F3.16.1.T003 | AI performance metrics | ⬜ TODO | 2h |
| E3.S12.PR1.004 | F3.16.1.T004 | Real-time updates (React Query) | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Dashboard functional
- [ ] Real-time data refresh
- [ ] KPI cards accurate
- [ ] Mobile responsive

---

### PR E3.S12.PR2: HITL Review Queue UI

**Branch:** `feature/e3-s12-pr2-hitl-ui`  
**Reviewer:** @frontend-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.16.2

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S12.PR2.001 | F3.16.2.T001 | Review Queue page | ⬜ TODO | 4h |
| E3.S12.PR2.002 | F3.16.2.T002 | Priority tabs și filters | ⬜ TODO | 2h |
| E3.S12.PR2.003 | F3.16.2.T003 | Conversation viewer | ⬜ TODO | 3h |
| E3.S12.PR2.004 | F3.16.2.T004 | Quick actions panel | ⬜ TODO | 2h |
| E3.S12.PR2.005 | F3.16.2.T005 | SLA timer component | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] Queue management UI
- [ ] Conversation context visible
- [ ] Quick response actions
- [ ] SLA countdown visual

---

### PR E3.S12.PR3: E2E & Integration Testing

**Branch:** `feature/e3-s12-pr3-testing`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.17.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S12.PR3.001 | F3.17.1.T001 | E2E tests pentru negotiation flows | ⬜ TODO | 4h |
| E3.S12.PR3.002 | F3.17.1.T002 | Integration tests pentru AI pipeline | ⬜ TODO | 3h |
| E3.S12.PR3.003 | F3.17.1.T003 | Load testing pentru workers | ⬜ TODO | 2h |
| E3.S12.PR3.004 | F3.17.1.T004 | Mock services pentru external APIs | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] E2E coverage pentru happy paths
- [ ] Integration tests pentru core flows
- [ ] Load tests pass benchmarks
- [ ] Mock services stable

---

### PR E3.S12.PR4: Documentation & OpenAPI

**Branch:** `feature/e3-s12-pr4-documentation`  
**Reviewer:** @lead-dev  
**Estimare:** 2 zile  
**Phase Mapping:** F3.18.1

#### Tasks

| Task ID | Phase ID | Denumire | Status | Estimare |
| --- | --- | --- | --- | --- |
| E3.S12.PR4.001 | F3.18.1.T001 | OpenAPI spec completare | ⬜ TODO | 4h |
| E3.S12.PR4.002 | F3.18.1.T002 | INDEX.md update final | ⬜ TODO | 2h |
| E3.S12.PR4.003 | F3.18.1.T003 | Runbook validation | ⬜ TODO | 2h |
| E3.S12.PR4.004 | F3.18.1.T004 | Developer guide update | ⬜ TODO | 2h |

#### Acceptance Criteria

- [ ] OpenAPI 100% complet
- [ ] INDEX.md cu toate linkurile
- [ ] Runbooks validated
- [ ] Dev guide current

---

## SUMAR TOTAL

### Per Sprint

| Sprint | PR-uri | Task-uri | Story Points | Perioada |
| --- | --- | --- | --- | --- |
| **E3.S1** | 4 | 16 | 35 | 3-7 Feb 2026 |
| **E3.S2** | 4 | 18 | 40 | 10-14 Feb 2026 |
| **E3.S3** | 4 | 20 | 45 | 17-21 Feb 2026 |
| **E3.S4** | 4 | 18 | 40 | 24-28 Feb 2026 |
| **E3.S5** | 4 | 16 | 35 | 3-7 Mar 2026 |
| **E3.S6** | 4 | 18 | 40 | 10-14 Mar 2026 |
| **E3.S7** | 4 | 16 | 35 | 17-21 Mar 2026 |
| **E3.S8** | 4 | 20 | 45 | 24-28 Mar 2026 |
| **E3.S9** | 4 | 16 | 35 | 31 Mar - 4 Apr 2026 |
| **E3.S10** | 4 | 18 | 40 | 7-11 Apr 2026 |
| **E3.S11** | 4 | 20 | 45 | 14-18 Apr 2026 |
| **E3.S12** | 4 | 18 | 50 | 21-24 Apr 2026 |
| **TOTAL** | **48** | **214** | **485** | **12 săptămâni** |

### Phase → Sprint Mapping Summary

| Phase Range | Sprint | Focus Area |
| --- | --- | --- |
| F3.1 - F3.2 | E3.S1 | Foundation & Product Knowledge |
| F3.3 | E3.S2 | Hybrid Search RAG |
| F3.4 | E3.S3 | AI Core & Orchestration |
| F3.5 | E3.S4 | Negotiation FSM |
| F3.6 | E3.S5 | Pricing Engine |
| F3.7 | E3.S6 | Stock & Inventory |
| F3.8 | E3.S7 | Oblio Integration |
| F3.9 | E3.S8 | e-Factura SPV |
| F3.10 | E3.S9 | Document Generation |
| F3.11 | E3.S10 | Handover & Channels |
| F3.12 - F3.14 | E3.S11 | Guardrails & HITL |
| F3.15 - F3.18 | E3.S12 | Frontend & Testing |

---

## Worker Category → Sprint Mapping

| Categoria | Workers | Sprint | PRs |
| --- | --- | --- | --- |
| **A** - Product Knowledge | 5 | E3.S1 | E3.S1.PR2-PR4 |
| **B** - Hybrid Search RAG | 6 | E3.S2 | E3.S2.PR1-PR4 |
| **C** - AI Core | 8 | E3.S3 | E3.S3.PR1-PR4 |
| **D** - Negotiation FSM | 6 | E3.S4 | E3.S4.PR1-PR4 |
| **E** - Pricing Engine | 5 | E3.S5 | E3.S5.PR1-PR4 |
| **F** - Stock & Inventory | 5 | E3.S6 | E3.S6.PR1-PR4 |
| **G** - Oblio Integration | 5 | E3.S7 | E3.S7.PR1-PR4 |
| **H** - e-Factura SPV | 6 | E3.S8 | E3.S8.PR1-PR4 |
| **I** - Document Generation | 5 | E3.S9 | E3.S9.PR1-PR4 |
| **J** - Handover & Channels | 8 | E3.S10 | E3.S10.PR1-PR4 |
| **K** - Sentiment & Intent | 4 | E3.S11 | E3.S11.PR1-PR2 |
| **L** - MCP Server | 3 | E3.S3 | E3.S3.PR3 |
| **M** - Guardrails | 6 | E3.S11 | E3.S11.PR1-PR2 |
| **N** - Human Intervention | 6 | E3.S11 | E3.S11.PR3-PR4 |
| **TOTAL** | **78** | - | - |

---

## CROSS-REFERENCES

### Documente Conexe

| Document | Path | Relevanță |
| --- | --- | --- |
| Plan Implementare Granular | `etapa3-plan-implementare.md` | Source pentru task JSON definitions |
| Index Documentație | `00-INDEX-ETAPA3.md` | Master index pentru toate docs |
| ADR Index | `../../adr/ADR-INDEX.md` | ADR-0068 → ADR-0087 |
| OpenAPI Spec | `../../api/openapi-etapa3.yaml` | API contract |
| Workers A-N | `etapa3-workers-*.md` | Worker specifications |
| API Endpoints | `etapa3-api-endpoints.md` | REST API documentation |
| Schemas | `etapa3-schemas.md` | Database schemas |
| Testing | `etapa3-testing.md` | Testing strategy |
| Runbook | `etapa3-runbook.md` | Operations guide |

### Dependințe

| Dependință | Descriere |
| --- | --- |
| Etapa 2 completă | Outreach pipeline funcțional |
| xAI API access | Grok-4 pentru AI agent |
| OpenAI API access | GPT-4o fallback |
| Oblio.eu account | Invoice generation |
| ANAF SPV certificate | e-Factura submission |
| TimelinesAI account | WhatsApp Business API |
| Resend account | Email delivery |
| AWS S3 bucket | Document storage |
| pgvector extension | Vector search pentru RAG |

### ADR References per Sprint

| Sprint | ADRs |
| --- | --- |
| E3.S1 | ADR-0068, ADR-0069 |
| E3.S2 | ADR-0070, ADR-0071 |
| E3.S3 | ADR-0072, ADR-0073, ADR-0074 |
| E3.S4 | ADR-0075, ADR-0076 |
| E3.S5 | ADR-0077 |
| E3.S6 | ADR-0078 |
| E3.S7 | ADR-0079 |
| E3.S8 | ADR-0080, ADR-0081 |
| E3.S9 | ADR-0082 |
| E3.S10 | ADR-0083, ADR-0084 |
| E3.S11 | ADR-0085, ADR-0086 |
| E3.S12 | ADR-0087 |

---

## Risk Mitigation

### High Priority Risks

| Risk | Mitigation | Sprint Impact |
| --- | --- | --- |
| xAI Grok-4 availability | OpenAI GPT-4o fallback ready | E3.S3 |
| ANAF SPV API changes | Buffer time în E3.S8 | E3.S8 |
| Oblio rate limits | Batch processing, queuing | E3.S7 |
| WhatsApp policy changes | Template pre-approval | E3.S10 |

### Technical Debt

| Item | Sprint | Resolution |
| --- | --- | --- |
| Hardcoded prompts | E3.S3 | Move to configurable templates |
| Missing metrics | E3.S12 | Add comprehensive observability |
| Manual DB migrations | E3.S1 | Implement automated migrations |

---

**Document generat:** 1 Februarie 2026  
**Ultima actualizare:** 1 Februarie 2026  
**Autor:** Cerniq Development Team
