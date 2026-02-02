# CERNIQ.APP — ETAPA 3: ARCHITECTURE DECISION RECORDS

## AI Sales Agent Neuro-Simbolic — INDEX ADRs

### Versiunea 2.0 | 19 Ianuarie 2026

---

**DOCUMENT STATUS:** INDEX — Referințe la ADR-uri individuale  
**SCOPE:** 20 ADR-uri pentru decizii arhitecturale Etapa 3  
**PREREQUISITE:** Etapa 1 + Etapa 2 complete  
**LOCAȚIE FIȘIERE:** [`docs/adr/ADR Etapa 3/`](../../adr/ADR%20Etapa%203/)

---

## CATALOG ADR-uri (20 Total)

| ADR | Titlu | Fișier | Status |
|-----|-------|--------|--------|
| ADR-0068 | Paradigmă Neuro-Simbolică pentru AI Agent | [ADR-0068](../../adr/ADR%20Etapa%203/ADR-0068-Neuro-Symbolic-AI-Agent-Paradigm.md) | ACCEPTED |
| ADR-0069 | xAI Grok-4 ca LLM Primary | [ADR-0069](../../adr/ADR%20Etapa%203/ADR-0069-xAI-Grok4-Primary-LLM.md) | ACCEPTED |
| ADR-0070 | Model Context Protocol (MCP) pentru Tool Access | [ADR-0070](../../adr/ADR%20Etapa%203/ADR-0070-MCP-Model-Context-Protocol.md) | ACCEPTED |
| ADR-0071 | Hybrid Search cu pgvector + BM25 + RRF | [ADR-0071](../../adr/ADR%20Etapa%203/ADR-0071-Hybrid-Search-pgvector-BM25-RRF.md) | ACCEPTED |
| ADR-0072 | Negotiation Finite State Machine | [ADR-0072](../../adr/ADR%20Etapa%203/ADR-0072-Negotiation-FSM.md) | ACCEPTED |
| ADR-0073 | Guardrails Anti-Hallucination Obligatorii | [ADR-0073](../../adr/ADR%20Etapa%203/ADR-0073-Anti-Hallucination-Guardrails.md) | ACCEPTED |
| ADR-0074 | Oblio.eu pentru Facturare | [ADR-0074](../../adr/ADR%20Etapa%203/ADR-0074-Oblio-Invoicing.md) | ACCEPTED |
| ADR-0075 | e-Factura Safety Net la 4 Zile | [ADR-0075](../../adr/ADR%20Etapa%203/ADR-0075-eFactura-Safety-Net.md) | ACCEPTED |
| ADR-0076 | Stock Reservation cu TTL | [ADR-0076](../../adr/ADR%20Etapa%203/ADR-0076-Stock-Reservation-TTL.md) | ACCEPTED |
| ADR-0077 | Discount Approval Thresholds | [ADR-0077](../../adr/ADR%20Etapa%203/ADR-0077-Discount-Approval-Thresholds.md) | ACCEPTED |
| ADR-0078 | Python 3.14 Free-Threading pentru MCP | [ADR-0078](../../adr/ADR%20Etapa%203/ADR-0078-Python-314-Free-Threading.md) | ACCEPTED |
| ADR-0079 | Separare Conversation Store | [ADR-0079](../../adr/ADR%20Etapa%203/ADR-0079-Conversation-Store-Separation.md) | ACCEPTED |
| ADR-0080 | Tool Call Logging Complet | [ADR-0080](../../adr/ADR%20Etapa%203/ADR-0080-Tool-Call-Logging.md) | ACCEPTED |
| ADR-0081 | Regenerare Response pe Guardrail Fail | [ADR-0081](../../adr/ADR%20Etapa%203/ADR-0081-Guardrail-Regeneration.md) | ACCEPTED |
| ADR-0082 | Sticky Session pentru Negociere | [ADR-0082](../../adr/ADR%20Etapa%203/ADR-0082-Sticky-Session.md) | ACCEPTED |
| ADR-0083 | PDF Generation cu WeasyPrint | [ADR-0083](../../adr/ADR%20Etapa%203/ADR-0083-WeasyPrint-PDF-Generation.md) | ACCEPTED |
| ADR-0084 | Chunking Strategy pentru RAG | [ADR-0084](../../adr/ADR%20Etapa%203/ADR-0084-RAG-Chunking-Strategy.md) | ACCEPTED |
| ADR-0085 | Embeddings cu OpenAI text-embedding-3-small | [ADR-0085](../../adr/ADR%20Etapa%203/ADR-0085-OpenAI-Embeddings.md) | ACCEPTED |
| ADR-0086 | LLM Fallback Strategy | [ADR-0086](../../adr/ADR%20Etapa%203/ADR-0086-LLM-Fallback-Strategy.md) | ACCEPTED |
| ADR-0087 | Audit Trail cu Hash Chain | [ADR-0087](../../adr/ADR%20Etapa%203/ADR-0087-Hash-Chain-Audit-Trail.md) | ACCEPTED |

---

## CATEGORII ADR-uri

### AI & LLM (6 ADRs)

| ADR | Topic |
|-----|-------|
| ADR-0068 | Paradigmă Neuro-Simbolică |
| ADR-0069 | xAI Grok-4 Primary |
| ADR-0070 | MCP Tool Access |
| ADR-0081 | Guardrail Regeneration |
| ADR-0085 | OpenAI Embeddings |
| ADR-0086 | LLM Fallback Strategy |

### Search & RAG (3 ADRs)

| ADR | Topic |
|-----|-------|
| ADR-0071 | Hybrid Search pgvector+BM25 |
| ADR-0084 | RAG Chunking Strategy |
| ADR-0085 | OpenAI Embeddings |

### Negociere & FSM (4 ADRs)

| ADR | Topic |
|-----|-------|
| ADR-0072 | Negotiation FSM |
| ADR-0073 | Anti-Hallucination Guardrails |
| ADR-0076 | Stock Reservation TTL |
| ADR-0077 | Discount Approval Thresholds |

### Fiscal & Compliance (3 ADRs)

| ADR | Topic |
|-----|-------|
| ADR-0074 | Oblio.eu Facturare |
| ADR-0075 | e-Factura Safety Net |
| ADR-0087 | Hash Chain Audit Trail |

### Infrastructure & Storage (4 ADRs)

| ADR | Topic |
|-----|-------|
| ADR-0078 | Python 3.14 Free-Threading |
| ADR-0079 | Conversation Store Separation |
| ADR-0080 | Tool Call Logging |
| ADR-0082 | Sticky Session |
| ADR-0083 | WeasyPrint PDF Generation |

---

## MAPARE VECHI → NOU

| Numerotare Veche | Numerotare Nouă |
|------------------|-----------------|
| ADR-301 | ADR-0068 |
| ADR-302 | ADR-0069 |
| ADR-303 | ADR-0070 |
| ADR-304 | ADR-0071 |
| ADR-305 | ADR-0072 |
| ADR-306 | ADR-0073 |
| ADR-307 | ADR-0074 |
| ADR-308 | ADR-0075 |
| ADR-309 | ADR-0076 |
| ADR-310 | ADR-0077 |
| ADR-311 | ADR-0078 |
| ADR-312 | ADR-0079 |
| ADR-313 | ADR-0080 |
| ADR-314 | ADR-0081 |
| ADR-315 | ADR-0082 |
| ADR-316 | ADR-0083 |
| ADR-317 | ADR-0084 |
| ADR-318 | ADR-0085 |
| ADR-319 | ADR-0086 |
| ADR-320 | ADR-0087 |

---

**Document generat:** 19 Ianuarie 2026  
**Total ADR-uri:** 20  
**Status:** Toate ACCEPTED  
**Conformitate:** Master Spec v1.2
